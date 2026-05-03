const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper: strip markdown fences and parse JSON cleanly
const parseJSON = (text) => {
  const clean = text
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();
  return JSON.parse(clean);
};

/**
 * Grade a single question using Gemini
 * Returns: { marks: number, feedback: string }
 */
const gradeAnswer = async ({
  questionText,
  maxMarks,
  modelAnswer,
  studentAnswer,
}) => {
  if (!studentAnswer || studentAnswer.trim().length < 3) {
    return { marks: 0, feedback: "No answer provided or answer too short." };
  }

  const prompt = `You are an expert exam evaluator. Grade the student's answer fairly and return ONLY valid JSON.

Question: ${questionText}
Max Marks: ${maxMarks}
Model Answer: ${modelAnswer}
Student Answer: ${studentAnswer}

Instructions:
- Award marks proportionally based on accuracy, completeness, and understanding
- Be fair but strict — partial credit is allowed
- Feedback must be 1-2 sentences, constructive, and specific to what the student wrote

Return ONLY this JSON (no markdown, no extra text):
{
  "marks": <number between 0 and ${maxMarks}>,
  "feedback": "<1-2 sentence constructive feedback>"
}`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const parsed = parseJSON(text);

    return {
      marks: Math.min(Math.max(Number(parsed.marks) || 0, 0), maxMarks),
      feedback: parsed.feedback || "Graded successfully.",
    };
  } catch (err) {
    console.error("AI grading error:", err.message);
    return {
      marks: Math.floor(maxMarks * 0.5),
      feedback:
        "Auto-graded (AI service temporarily unavailable). Please review manually.",
    };
  }
};

/**
 * Grade all questions for a student sheet
 */
const gradeSheet = async (questions, ocrText) => {
  const results = [];
  for (const question of questions) {
    const studentAnswer = ocrText[`q${question.questionNumber}`] || "";
    const { marks, feedback } = await gradeAnswer({
      questionText: question.questionText,
      maxMarks: question.maxMarks,
      modelAnswer: question.modelAnswer,
      studentAnswer,
    });
    results.push({
      questionId: question._id,
      questionNumber: question.questionNumber,
      questionText: question.questionText,
      studentAnswer,
      marksAwarded: marks,
      maxMarks: question.maxMarks,
      feedback,
    });
  }
  return results;
};

/**
 * Extract questions from plain text of a question paper using Gemini
 */
const extractQuestionsFromPaper = async (paperText) => {
  const prompt = `You are an exam paper parser. Extract all questions from this exam paper and return ONLY valid JSON.

Exam Paper Content:
${paperText}

Instructions:
- Extract each question with its number, text, and marks
- If marks are not specified, default to 5
- Generate a detailed model answer for each question
- Number questions sequentially starting from 1

Return ONLY this JSON array (no markdown, no extra text):
[
  {
    "questionNumber": 1,
    "questionText": "<exact question text>",
    "maxMarks": <number>,
    "modelAnswer": "<detailed model answer>"
  }
]`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const parsed = parseJSON(text);
    if (!Array.isArray(parsed)) throw new Error("Expected array");
    return parsed;
  } catch (err) {
    console.error("Question extraction error:", err.message);
    throw new Error("Failed to extract questions: " + err.message);
  }
};

/**
 * Extract questions from a question paper image using Gemini Vision
 */
const extractQuestionsFromImage = async (imageBase64, mimeType) => {
  const prompt = `You are an exam paper parser. Look at this exam paper image and extract all questions. Return ONLY valid JSON.

Instructions:
- Extract each question with its number, text, and marks (if visible)
- If marks are not visible, default to 5
- Generate a detailed model answer for each question
- Number questions sequentially starting from 1

Return ONLY this JSON array (no markdown, no extra text):
[
  {
    "questionNumber": 1,
    "questionText": "<exact question text from image>",
    "maxMarks": <number>,
    "modelAnswer": "<detailed model answer>"
  }
]`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType, data: imageBase64 } },
    ]);
    const text = result.response.text().trim();
    const parsed = parseJSON(text);
    if (!Array.isArray(parsed)) throw new Error("Expected array");
    return parsed;
  } catch (err) {
    console.error("Vision extraction error:", err.message);
    throw new Error("Failed to extract questions from image: " + err.message);
  }
};

module.exports = {
  gradeSheet,
  extractQuestionsFromPaper,
  extractQuestionsFromImage,
};
