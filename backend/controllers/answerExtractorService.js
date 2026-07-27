const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

const cleanJSON = (text) => {
  return JSON.parse(
    text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim(),
  );
};

/**
 * Match OCR'd raw text back to each question, returning
 * { q1: "answer text", q2: "answer text", ... }
 */
const extractAnswers = async (ocrText, questions) => {
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
  });

  const prompt = `
You are an answer extraction engine.

OCR TEXT

${ocrText}

Questions

${JSON.stringify(
  questions.map((q) => ({
    number: q.questionNumber,
    question: q.questionText,
  })),
  null,
  2,
)}

Task

Match every student's answer to its corresponding question, using the
question numbers/text as anchors in the OCR text.

Rules

- Ignore student name.
- Ignore page numbers.
- Ignore headers.
- Ignore footers.
- Preserve equations.
- Preserve spelling mistakes exactly as written — do not correct them.
- If a question was left unanswered or cannot be found in the text, return
  an empty string for it.

Return ONLY JSON, no markdown fences, no prose, with one key per question
number, e.g.:
{
    "q1":"",
    "q2":"",
    "q3":""
}
`;

  const result = await model.generateContent(prompt);
  const parsed = cleanJSON(result.response.text());

  // Defensive fallback: guarantee every question has a key, even if the
  // model dropped one, so downstream grading never sees `undefined`.
  const structured = {};
  questions.forEach((q) => {
    const key = `q${q.questionNumber}`;
    structured[key] =
      typeof parsed[key] === "string" ? parsed[key] : "";
  });
  return structured;
};

module.exports = {
  extractAnswers,
};
