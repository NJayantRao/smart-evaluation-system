/**
 * OCR Service
 *
 * OCR_MODE=google  -> real Google Cloud Vision DOCUMENT_TEXT_DETECTION
 *                      (handles both printed and handwritten text; this is
 *                      what you want for real student answer sheets)
 * OCR_MODE=mock    -> skips Vision entirely and returns placeholder text,
 *                      so the rest of the pipeline (grading + PDF report)
 *                      can be exercised/demoed without Google credentials
 */

const fs = require("fs");
const path = require("path");
const { extractAnswers } = require("./answerExtractorService");

const buildVisionClient = () => {
  const vision = require("@google-cloud/vision");

  if (process.env.GOOGLE_VISION_KEY_JSON) {
    return new vision.ImageAnnotatorClient({
      credentials: JSON.parse(process.env.GOOGLE_VISION_KEY_JSON),
    });
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS in .env");
  }

  return new vision.ImageAnnotatorClient();
};

// ---------------- OCR CORE (Google Vision) ----------------

const googleOCR = async (filePath) => {
  const client = buildVisionClient();

  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();
  const isPDF = ext === ".pdf";

  console.log("📄 OCR File:", filePath);
  console.log("📦 File Size:", fs.statSync(filePath).size, "bytes");
  console.log("📂 Type:", isPDF ? "PDF" : "IMAGE");

  let fullText = "";

  try {
    if (isPDF) {
      const content = fs.readFileSync(filePath).toString("base64");

      const [result] = await client.batchAnnotateFiles({
        requests: [
          {
            inputConfig: {
              content,
              mimeType: "application/pdf",
            },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          },
        ],
      });

      const pages = result.responses?.[0]?.responses || [];
      console.log("📑 Pages detected:", pages.length);

      fullText = pages.map((p) => p.fullTextAnnotation?.text || "").join("\n");
    } else {
      // documentTextDetection uses DOCUMENT_TEXT_DETECTION under the hood,
      // which is Vision's mode tuned for dense/handwritten text (vs. plain
      // TEXT_DETECTION which is tuned for short strings on signs, labels etc).
      const [result] = await client.documentTextDetection(filePath);

      if (result.error) {
        throw new Error(result.error.message);
      }

      fullText = result.fullTextAnnotation?.text || "";
    }

    if (!fullText) {
      throw new Error(
        "No text extracted from file — the scan may be too faint, blurry, or rotated for OCR.",
      );
    }

    console.log("📝 OCR Preview:\n", fullText.substring(0, 300));
    return fullText;
  } catch (err) {
    console.error("❌ OCR Failed:", err.message);
    throw new Error("OCR failed: " + err.message);
  }
};

// ---------------- MOCK OCR (no credentials needed) ----------------

const mockOCR = async (filePath, questions) => {
  console.log("🧪 OCR_MODE=mock — skipping Google Vision, using placeholder text");
  const structured = {};
  questions.forEach((q) => {
    structured[`q${q.questionNumber}`] =
      "[Mock OCR] Sample student answer for demo purposes.";
  });
  return structured;
};

// ---------------- MAIN FUNCTION ----------------

const extractText = async (filePath, questions) => {
  console.log("🚀 Starting OCR pipeline...");

  if ((process.env.OCR_MODE || "google").toLowerCase() === "mock") {
    return mockOCR(filePath, questions);
  }

  const rawText = await googleOCR(filePath);

  console.log("🔍 Parsing answers...");
  const structured = await extractAnswers(rawText, questions);

  console.log("✅ OCR + Parsing complete");
  return structured;
};

module.exports = { extractText };
