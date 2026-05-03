const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");
const Exam = require("../models/Exam");
const StudentSheet = require("../models/StudentSheet");
const { extractText } = require("../controllers/ocrService");
const {
  gradeSheet,
  extractQuestionsFromPaper,
  extractQuestionsFromImage,
} = require("../controllers/gradingService");
const { generatePDF } = require("../controllers/pdfService");
const fs = require("fs");
const path = require("path");

// ─── EXAM CRUD ──────────────────────────────────────────────────────────────

// POST /api/exams — Create exam
router.post("/", protect, async (req, res) => {
  const { title, subject, totalMarks, questions } = req.body;
  if (!title || !subject || !totalMarks)
    return res
      .status(400)
      .json({ message: "Title, subject, and totalMarks are required" });

  const exam = await Exam.create({
    teacher: req.user._id,
    title,
    subject,
    totalMarks,
    questions: questions || [],
  });
  res.status(201).json(exam);
});

// GET /api/exams — List all exams for the logged-in teacher
router.get("/", protect, async (req, res) => {
  const exams = await Exam.find({ teacher: req.user._id }).sort({
    createdAt: -1,
  });
  res.json(exams);
});

// GET /api/exams/:id — Get single exam
router.get("/:id", protect, async (req, res) => {
  const exam = await Exam.findOne({
    _id: req.params.id,
    teacher: req.user._id,
  });
  if (!exam) return res.status(404).json({ message: "Exam not found" });
  res.json(exam);
});

// DELETE /api/exams/:id — Delete exam
router.delete("/:id", protect, async (req, res) => {
  const exam = await Exam.findOneAndDelete({
    _id: req.params.id,
    teacher: req.user._id,
  });
  if (!exam) return res.status(404).json({ message: "Exam not found" });
  await StudentSheet.deleteMany({ exam: exam._id });
  res.json({ message: "Exam deleted" });
});

// POST /api/exams/:id/questions — Add/replace questions
router.post("/:id/questions", protect, async (req, res) => {
  const exam = await Exam.findOne({
    _id: req.params.id,
    teacher: req.user._id,
  });
  if (!exam) return res.status(404).json({ message: "Exam not found" });
  exam.questions = req.body.questions;
  await exam.save();
  res.json(exam);
});

// ─── QUESTION PAPER UPLOAD & EXTRACTION ─────────────────────────────────────

// POST /api/exams/:id/upload-question-paper — Upload question paper and extract questions
router.post(
  "/:id/upload-question-paper",
  protect,
  upload.single("questionPaper"),
  async (req, res) => {
    const exam = await Exam.findOne({
      _id: req.params.id,
      teacher: req.user._id,
    });
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    try {
      const filePath = req.file.path;
      const mimeType = req.file.mimetype;
      let questions;

      if (mimeType === "application/pdf") {
        // For PDF: extract text first using pdf-parse, then send to Gemini
        const pdfParse = require("pdf-parse");
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        const paperText = pdfData.text;

        if (paperText && paperText.trim().length > 50) {
          questions = await extractQuestionsFromPaper(paperText);
        } else {
          // PDF has no extractable text (scanned) — use vision
          // Convert first page to image via sharp or use base64 of pdf
          const imageBase64 = fs.readFileSync(filePath).toString("base64");
          questions = await extractQuestionsFromImage(
            imageBase64,
            "application/pdf",
          );
        }
      } else {
        // Image file — use Gemini Vision
        const imageBase64 = fs.readFileSync(filePath).toString("base64");
        questions = await extractQuestionsFromImage(imageBase64, mimeType);
      }

      // Clean up temp file
      fs.unlinkSync(filePath);

      // Update exam with extracted questions
      exam.questions = questions.map((q, i) => ({
        questionNumber: q.questionNumber || i + 1,
        questionText: q.questionText,
        maxMarks: Number(q.maxMarks) || 5,
        modelAnswer: q.modelAnswer || "",
      }));

      // Update totalMarks to match extracted questions
      const totalFromQuestions = exam.questions.reduce(
        (s, q) => s + q.maxMarks,
        0,
      );
      if (totalFromQuestions > 0 && !req.body.keepTotalMarks) {
        exam.totalMarks = totalFromQuestions;
      }

      await exam.save();
      res.json({ exam, questionsExtracted: exam.questions.length });
    } catch (err) {
      console.error("Question paper extraction error:", err.message);
      // Clean up file on error
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({
        message: err.message || "Failed to extract questions from paper",
      });
    }
  },
);

// POST /api/exams/parse-question-paper — Parse paper without attaching to exam (standalone)
router.post(
  "/parse-question-paper",
  protect,
  upload.single("questionPaper"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    try {
      const filePath = req.file.path;
      const mimeType = req.file.mimetype;
      let questions;

      if (mimeType === "application/pdf") {
        const pdfParse = require("pdf-parse");
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        const paperText = pdfData.text;

        if (paperText && paperText.trim().length > 50) {
          questions = await extractQuestionsFromPaper(paperText);
        } else {
          const imageBase64 = fs.readFileSync(filePath).toString("base64");
          questions = await extractQuestionsFromImage(
            imageBase64,
            "application/pdf",
          );
        }
      } else {
        const imageBase64 = fs.readFileSync(filePath).toString("base64");
        questions = await extractQuestionsFromImage(imageBase64, mimeType);
      }

      fs.unlinkSync(filePath);
      res.json({ questions, questionsExtracted: questions.length });
    } catch (err) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res
        .status(500)
        .json({ message: err.message || "Failed to extract questions" });
    }
  },
);

// ─── STUDENT SHEET UPLOAD ────────────────────────────────────────────────────

// POST /api/exams/:id/upload — Upload a student sheet
router.post(
  "/:id/upload",
  protect,
  upload.single("sheet"),
  async (req, res) => {
    const exam = await Exam.findOne({
      _id: req.params.id,
      teacher: req.user._id,
    });
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    const { studentName, rollNumber } = req.body;
    if (!studentName || !rollNumber)
      return res
        .status(400)
        .json({ message: "studentName and rollNumber are required" });

    const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const sheet = await StudentSheet.create({
      exam: exam._id,
      studentName,
      rollNumber,
      fileUrl,
      status: "uploaded",
    });

    res.status(201).json(sheet);
  },
);

// ─── GRADING ─────────────────────────────────────────────────────────────────

// POST /api/exams/:id/grade/:sheetId — Run OCR + AI grading on a sheet
router.post("/:id/grade/:sheetId", protect, async (req, res) => {
  const exam = await Exam.findOne({
    _id: req.params.id,
    teacher: req.user._id,
  });
  if (!exam) return res.status(404).json({ message: "Exam not found" });

  const sheet = await StudentSheet.findOne({
    _id: req.params.sheetId,
    exam: exam._id,
  });
  if (!sheet) return res.status(404).json({ message: "Sheet not found" });

  if (exam.questions.length === 0)
    return res.status(400).json({
      message: "No questions found for this exam. Please add questions first.",
    });

  try {
    // Step 1: OCR
    const filePath = sheet.fileUrl
      ? path.join(__dirname, "..", sheet.fileUrl)
      : null;
    const ocrText = await extractText(filePath, exam.questions);
    sheet.ocrText = ocrText;
    sheet.status = "ocr_done";
    await sheet.save();

    // Step 2: AI Grading
    const gradingResults = await gradeSheet(exam.questions, ocrText);
    const totalMarks = gradingResults.reduce(
      (sum, r) => sum + r.marksAwarded,
      0,
    );
    const maxTotalMarks = gradingResults.reduce(
      (sum, r) => sum + r.maxMarks,
      0,
    );

    // Step 3: Generate PDF
    const { fileName } = await generatePDF({
      studentName: sheet.studentName,
      rollNumber: sheet.rollNumber,
      examTitle: exam.title,
      subject: exam.subject,
      gradingResults,
      totalMarks,
      maxTotalMarks,
    });

    sheet.gradingResults = gradingResults;
    sheet.totalMarks = totalMarks;
    sheet.maxTotalMarks = maxTotalMarks;
    sheet.pdfUrl = `/uploads/${fileName}`;
    sheet.status = "graded";
    await sheet.save();

    res.json(sheet);
  } catch (err) {
    sheet.status = "error";
    await sheet.save();
    throw err;
  }
});

// GET /api/exams/:id/results — All students graded for an exam
router.get("/:id/results", protect, async (req, res) => {
  const exam = await Exam.findOne({
    _id: req.params.id,
    teacher: req.user._id,
  });
  if (!exam) return res.status(404).json({ message: "Exam not found" });

  const sheets = await StudentSheet.find({ exam: exam._id }).sort({
    createdAt: -1,
  });
  res.json({ exam, sheets });
});

module.exports = router;
