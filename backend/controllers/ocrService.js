/**
 * OCR Service
 * OCR_MODE=mock  → returns realistic simulated student answers (great for demo)
 * OCR_MODE=google → uses Google Cloud Vision API (requires credentials)
 */

const fs = require("fs");

// Mock OCR: generates plausible student answers based on question count
const mockOCR = (questions) => {
  const mockAnswers = {
    1: "Newton's first law states that an object at rest stays at rest unless acted upon by an external force. This is also called the law of inertia.",
    2: "The force equals mass times acceleration. F = ma. If mass is 5kg and acceleration is 2m/s², force is 10 Newtons.",
    3: "Kinetic energy is the energy possessed by an object due to its motion. KE = 1/2 mv². Potential energy is stored energy due to position.",
    4: "The law of conservation of energy states that energy cannot be created or destroyed, only converted from one form to another.",
    5: "Ohm's law states that current is directly proportional to voltage and inversely proportional to resistance. V = IR.",
  };

  const result = {};
  questions.forEach((q, idx) => {
    result[`q${q.questionNumber}`] =
      mockAnswers[(idx % 5) + 1] ||
      `Student answer for question ${q.questionNumber}: This is a simulated OCR response demonstrating the system.`;
  });
  return result;
};

// Google Cloud Vision OCR (real implementation)
const googleOCR = async (filePath, questions) => {
  // Requires: npm install @google-cloud/vision
  // and GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account JSON
  try {
    const vision = require("@google-cloud/vision");
    const client = new vision.ImageAnnotatorClient();
    const [result] = await client.textDetection(filePath);
    const fullText = result.fullTextAnnotation?.text || "";

    // Simple split strategy: divide text equally per question
    // In production, use structured layout detection or answer markers
    const lines = fullText.split("\n").filter((l) => l.trim());
    const chunkSize = Math.ceil(lines.length / questions.length);
    const ocrResult = {};
    questions.forEach((q, idx) => {
      const chunk = lines
        .slice(idx * chunkSize, (idx + 1) * chunkSize)
        .join(" ");
      ocrResult[`q${q.questionNumber}`] = chunk || "No answer detected";
    });
    return ocrResult;
  } catch (err) {
    console.error("Google Vision OCR failed:", err.message);
    throw new Error("OCR failed: " + err.message);
  }
};

const extractText = async (filePath, questions) => {
  const mode = process.env.OCR_MODE || "mock";
  if (mode === "google") {
    return await googleOCR(filePath, questions);
  }
  // Default: mock
  return mockOCR(questions);
};

module.exports = { extractText };
