const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configurable via .env so the model can be swapped without touching code
// (e.g. if a model name is retired/renamed by Google).
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

const model = genAI.getGenerativeModel({
  model: MODEL_NAME,
});

function stripMarkdown(text = "") {
  return text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();
}

// Gemini sometimes wraps the array in an object, or returns a single object
// instead of an array. Coerce whatever comes back into an array we can map
// over, instead of crashing later.
function coerceArray(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
  if (parsed && Array.isArray(parsed.results)) return parsed.results;
  if (parsed && typeof parsed === "object") return [parsed];
  return [];
}

function parseJSON(text) {
  return JSON.parse(stripMarkdown(text));
}

async function generateJSON(prompt, parts = null, retries = 2) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const result = parts
        ? await model.generateContent([prompt, ...parts])
        : await model.generateContent(prompt);

      return parseJSON(result.response.text());
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(
    `Gemini request failed after ${retries + 1} attempt(s): ${lastErr.message}`,
  );
}

// Normalize AI-extracted questions into the exact shape the Exam model and
// frontend expect, filling in sane defaults for anything missing so a messy
// model response never breaks exam creation.
function normalizeQuestions(rawQuestions) {
  const list = coerceArray(rawQuestions).filter(
    (q) => q && (q.questionText || q.question),
  );

  return list.map((q, i) => ({
    questionNumber: Number(q.questionNumber) || i + 1,
    questionText: String(q.questionText || q.question || "").trim(),
    maxMarks: Number(q.maxMarks) > 0 ? Number(q.maxMarks) : 5,
    modelAnswer: String(q.modelAnswer || q.answer || "").trim(),
  }));
}

async function extractQuestionsFromPaper(paperText) {
  const prompt = `
You are extracting exam questions from the raw text of a scanned question paper.

PAPER TEXT
${paperText}

TASK
Identify every distinct question in the paper, in order. Ignore headers,
instructions, page numbers, and the exam title/subject line. For each
question:
- Keep the question text exactly as written (fix only obvious OCR noise).
- If marks are printed next to the question (e.g. "[5 marks]", "(10)"), use
  that number as maxMarks. Otherwise default maxMarks to 5.
- Write a concise, correct model answer for grading reference.

Do not invent questions that are not present in the text.

Return ONLY a JSON array, no markdown fences, no prose, in exactly this shape:
[
  {
    "questionNumber": 1,
    "questionText": "the full question text",
    "maxMarks": 5,
    "modelAnswer": "a concise, correct reference answer"
  }
]
`;

  const raw = await generateJSON(prompt);
  return normalizeQuestions(raw);
}

async function extractQuestionsFromImage(imageBase64, mimeType) {
  const prompt = `
You are extracting exam questions from an image of a question paper.

TASK
Identify every distinct question visible in the image, in order. Ignore
headers, instructions, page numbers, and the exam title/subject line. For
each question:
- Transcribe the question text as accurately as possible.
- If marks are printed next to the question (e.g. "[5 marks]", "(10)"), use
  that number as maxMarks. Otherwise default maxMarks to 5.
- Write a concise, correct model answer for grading reference.

Do not invent questions that are not visible in the image.

Return ONLY a JSON array, no markdown fences, no prose, in exactly this shape:
[
  {
    "questionNumber": 1,
    "questionText": "the full question text",
    "maxMarks": 5,
    "modelAnswer": "a concise, correct reference answer"
  }
]
`;

  const raw = await generateJSON(prompt, [
    {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    },
  ]);
  return normalizeQuestions(raw);
}

/**
 * Grade a full answer sheet.
 *
 * @param questions        Exam.questions array: { questionNumber, questionText, maxMarks, modelAnswer }
 * @param studentAnswers   OCR-extracted answers keyed by question, e.g. { q1: "...", q2: "..." }
 *                         (this is the shape produced by answerExtractorService.extractAnswers)
 * @returns Array matching StudentSheet's gradingResults schema, one entry per question, always.
 */
async function gradeSheet(questions, studentAnswers) {
  const prompt = `
You are an expert exam evaluator grading a student's answer sheet.

QUESTIONS (with the reference model answer and max marks for each):
${JSON.stringify(
  questions.map((q) => ({
    questionNumber: q.questionNumber,
    questionText: q.questionText,
    maxMarks: q.maxMarks,
    modelAnswer: q.modelAnswer,
  })),
  null,
  2,
)}

STUDENT ANSWERS (extracted via OCR, keyed by question number, e.g. "q1"):
${JSON.stringify(studentAnswers, null, 2)}

TASK
Grade every question independently by comparing the student's answer against
the model answer. Award partial credit for partially correct or incomplete
answers — do not require an exact word match, judge conceptual correctness.
If a student's answer is empty, missing, or reads "No answer detected",
award 0 marks and say so in the feedback.

marksAwarded must always be a whole number between 0 and that question's
maxMarks (inclusive) — never higher than maxMarks, never negative.

Return ONLY a JSON array, no markdown fences, no prose, with EXACTLY one
object per question, in this exact shape:
[
  {
    "questionNumber": 1,
    "questionText": "the exact question text",
    "studentAnswer": "the student's answer as extracted (or empty string)",
    "marksAwarded": 0,
    "maxMarks": 5,
    "feedback": "one or two sentence explanation of the score"
  }
]
`;

  const raw = await generateJSON(prompt);
  const results = coerceArray(raw);

  // Defensive normalization: whatever Gemini actually returned, guarantee
  // one well-formed result per question so the PDF report and frontend never
  // break on a missing field or an out-of-range mark.
  return questions.map((q, i) => {
    const match =
      results.find((r) => Number(r?.questionNumber) === q.questionNumber) ||
      results[i] ||
      {};

    const rawMarks = Number(match.marksAwarded);
    const marksAwarded = Number.isFinite(rawMarks)
      ? Math.min(Math.max(Math.round(rawMarks), 0), q.maxMarks)
      : 0;

    return {
      questionNumber: q.questionNumber,
      questionText: q.questionText,
      studentAnswer:
        match.studentAnswer || studentAnswers?.[`q${q.questionNumber}`] || "",
      marksAwarded,
      maxMarks: q.maxMarks,
      feedback: match.feedback || "No feedback available.",
    };
  });
}

module.exports = {
  extractQuestionsFromPaper,
  extractQuestionsFromImage,
  gradeSheet,
};
