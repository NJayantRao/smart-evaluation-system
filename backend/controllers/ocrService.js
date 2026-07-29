/**
 * OCR Service
 *
 * OCR_MODE=google  -> Uses Google Cloud Vision DOCUMENT_TEXT_DETECTION
 * OCR_MODE=mock    -> Returns placeholder OCR output for testing/demo
 */

const { extractAnswers } = require("./answerExtractorService");

// ---------------- GOOGLE VISION CLIENT ----------------

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

// ---------------- OCR CORE ----------------

const googleOCR = async (buffer, mimeType) => {
  const client = buildVisionClient();

  if (!buffer) {
    throw new Error("No file buffer received for OCR.");
  }

  const isPDF = mimeType === "application/pdf";

  console.log("📦 OCR Buffer Size:", buffer.length, "bytes");
  console.log("📂 Type:", mimeType);

  let fullText = "";

  try {
    if (isPDF) {
      // PDF -> Vision Batch OCR
      const content = buffer.toString("base64");

      const [result] = await client.batchAnnotateFiles({
        requests: [
          {
            inputConfig: {
              content,
              mimeType: "application/pdf",
            },
            features: [
              {
                type: "DOCUMENT_TEXT_DETECTION",
              },
            ],
          },
        ],
      });

      const pages = result.responses?.[0]?.responses || [];

      console.log("📑 Pages detected:", pages.length);

      fullText = pages
        .map((page) => page.fullTextAnnotation?.text || "")
        .join("\n");
    } else {
      // Image OCR
      const [result] = await client.documentTextDetection({
        image: {
          content: buffer,
        },
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      fullText = result.fullTextAnnotation?.text || "";
    }

    if (!fullText || !fullText.trim()) {
      throw new Error(
        "No text extracted from the document. The scan may be blurry, faint, rotated or empty.",
      );
    }

    console.log("📝 OCR Preview:\n", fullText.substring(0, 300), "...");

    return fullText;
  } catch (err) {
    console.error("❌ OCR Failed:", err.message);
    throw new Error("OCR failed: " + err.message);
  }
};

// ---------------- MAIN FUNCTION ----------------

const extractText = async (buffer, mimeType, questions) => {
  console.log("🚀 Starting OCR pipeline...");

  const rawText = await googleOCR(buffer, mimeType);

  console.log("🔍 Parsing answers...");
  const structured = await extractAnswers(rawText, questions);

  console.log("✅ OCR + Parsing complete");

  return structured;
};

module.exports = { extractText };
