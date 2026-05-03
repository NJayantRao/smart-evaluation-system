const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

/**
 * Strip characters that WinAnsi / pdf-lib StandardFonts cannot encode.
 * Removes emoji and any codepoint above U+00FF (Latin-1 boundary).
 */
const sanitize = (str) =>
  String(str ?? "")
    .replace(/[^\x00-\xFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const generatePDF = async ({
  studentName,
  rollNumber,
  examTitle,
  subject,
  gradingResults,
  totalMarks,
  maxTotalMarks,
}) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 595;
  const PAGE_H = 842;
  const MARGIN = 40;

  const colors = {
    primary: rgb(0.1, 0.1, 0.4),
    accent: rgb(0.2, 0.5, 0.9),
    green: rgb(0.1, 0.6, 0.3),
    red: rgb(0.8, 0.2, 0.2),
    gray: rgb(0.5, 0.5, 0.5),
    lightGray: rgb(0.9, 0.9, 0.9),
    white: rgb(1, 1, 1),
    dark: rgb(0.1, 0.1, 0.1),
  };

  // ── Page management ──────────────────────────────────────────────────────
  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - 40;

  const ensureSpace = (needed = 60) => {
    if (y < MARGIN + needed) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const drawLine = (yPos) => {
    page.drawLine({
      start: { x: MARGIN, y: yPos },
      end: { x: PAGE_W - MARGIN, y: yPos },
      thickness: 0.5,
      color: colors.gray,
    });
  };

  // All text is sanitized to strip emoji / non-Latin-1 chars before drawing
  const writeText = (raw, x, yPos, opts = {}) => {
    const text = sanitize(raw);
    if (!text) return;
    page.drawText(text, {
      x,
      y: yPos,
      size: opts.size || 10,
      font: opts.bold ? boldFont : font,
      color: opts.color || colors.dark,
      maxWidth: opts.maxWidth || PAGE_W - MARGIN * 2,
    });
  };

  // Wrap text into lines of at most maxChars characters
  const wrapText = (raw, maxChars = 90) => {
    const text = sanitize(raw);
    if (!text) return [];
    const lines = [];
    let remaining = text;
    while (remaining.length > maxChars) {
      let cut = remaining.lastIndexOf(" ", maxChars);
      if (cut <= 0) cut = maxChars;
      lines.push(remaining.slice(0, cut));
      remaining = remaining.slice(cut).trim();
    }
    if (remaining) lines.push(remaining);
    return lines;
  };

  // ── Page 1 header ─────────────────────────────────────────────────────────
  page.drawRectangle({
    x: 0,
    y: PAGE_H - 80,
    width: PAGE_W,
    height: 80,
    color: colors.primary,
  });
  writeText("STUDENT EVALUATION REPORT", MARGIN, PAGE_H - 35, {
    size: 18,
    bold: true,
    color: colors.white,
  });
  writeText("Smart Evaluation System", MARGIN, PAGE_H - 55, {
    size: 10,
    color: rgb(0.7, 0.7, 1),
  });
  y = PAGE_H - 100;

  // ── Student info box ──────────────────────────────────────────────────────
  page.drawRectangle({
    x: MARGIN,
    y: y - 70,
    width: PAGE_W - MARGIN * 2,
    height: 70,
    color: colors.lightGray,
  });
  writeText(`Name: ${studentName}`, 55, y - 20, { bold: true, size: 12 });
  writeText(`Roll No: ${rollNumber}`, 55, y - 38, {
    size: 10,
    color: colors.gray,
  });
  writeText(`Exam: ${examTitle}`, 300, y - 20, { bold: true, size: 12 });
  writeText(`Subject: ${subject}`, 300, y - 38, {
    size: 10,
    color: colors.gray,
  });

  // ── Total score ───────────────────────────────────────────────────────────
  const percentage =
    maxTotalMarks > 0 ? Math.round((totalMarks / maxTotalMarks) * 100) : 0;
  const scoreColor =
    percentage >= 70
      ? colors.green
      : percentage >= 40
        ? colors.accent
        : colors.red;
  writeText(
    `Total Score: ${totalMarks} / ${maxTotalMarks}  (${percentage}%)`,
    55,
    y - 58,
    { bold: true, size: 13, color: scoreColor },
  );

  y -= 90;
  drawLine(y);
  y -= 15;

  // ── Column headers ────────────────────────────────────────────────────────
  writeText("Q#", MARGIN, y, { bold: true, size: 9, color: colors.gray });
  writeText("Question", MARGIN + 30, y, {
    bold: true,
    size: 9,
    color: colors.gray,
  });
  writeText("Marks", PAGE_W - 120, y, {
    bold: true,
    size: 9,
    color: colors.gray,
  });
  y -= 8;
  drawLine(y);
  y -= 14;

  // ── Question rows ─────────────────────────────────────────────────────────
  for (const result of gradingResults) {
    const feedbackLines = wrapText(result.feedback || "", 88);
    const answerLines = wrapText(result.studentAnswer || "No answer", 88);
    const rowHeight =
      18 + answerLines.length * 12 + feedbackLines.length * 12 + 16;

    ensureSpace(rowHeight);

    const markColor =
      result.marksAwarded === result.maxMarks
        ? colors.green
        : result.marksAwarded === 0
          ? colors.red
          : colors.accent;

    // Question number + question text + marks
    writeText(`Q${result.questionNumber}`, MARGIN, y, { bold: true, size: 10 });
    const qRaw = sanitize(result.questionText);
    const qDisplay = qRaw.length > 58 ? qRaw.slice(0, 55) + "..." : qRaw;
    writeText(qDisplay, MARGIN + 30, y, { size: 10 });
    writeText(`${result.marksAwarded} / ${result.maxMarks}`, PAGE_W - 120, y, {
      bold: true,
      size: 10,
      color: markColor,
    });
    y -= 16;

    // Student answer (wrapped)
    answerLines.forEach((line, i) => {
      writeText(
        i === 0 ? `Answer: ${line}` : `        ${line}`,
        MARGIN + 30,
        y,
        { size: 8, color: colors.gray, maxWidth: PAGE_W - 160 },
      );
      y -= 12;
    });

    // Feedback (wrapped) — "Feedback:" label replaces the emoji
    feedbackLines.forEach((line, i) => {
      writeText(
        i === 0 ? `Feedback: ${line}` : `          ${line}`,
        MARGIN + 30,
        y,
        { size: 8, color: colors.primary, maxWidth: PAGE_W - 160 },
      );
      y -= 12;
    });

    drawLine(y);
    y -= 14;
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  drawLine(47);
  writeText(
    `Generated by Smart Eval  |  ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}`,
    MARGIN,
    35,
    { size: 8, color: colors.gray },
  );

  // ── Save ──────────────────────────────────────────────────────────────────
  const pdfBytes = await pdfDoc.save();
  const fileName = `report_${sanitize(rollNumber)}_${Date.now()}.pdf`;
  const outputPath = path.join(__dirname, "../uploads", fileName);
  fs.writeFileSync(outputPath, pdfBytes);

  return { fileName, filePath: outputPath };
};

module.exports = { generatePDF };
