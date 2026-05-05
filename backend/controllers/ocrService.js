/**
 * OCR Service (Google Vision - Production Ready)
 */

const fs = require('fs');
const path = require('path');

const buildVisionClient = () => {
  const vision = require('@google-cloud/vision');

  if (process.env.GOOGLE_VISION_KEY_JSON) {
    return new vision.ImageAnnotatorClient({
      credentials: JSON.parse(process.env.GOOGLE_VISION_KEY_JSON),
    });
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('Missing GOOGLE_APPLICATION_CREDENTIALS in .env');
  }

  return new vision.ImageAnnotatorClient();
};


// ---------------- OCR CORE ----------------

const googleOCR = async (filePath) => {
  const client = buildVisionClient();

  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();
  const isPDF = ext === '.pdf';

  console.log("📄 OCR File:", filePath);
  console.log("📦 File Size:", fs.statSync(filePath).size, "bytes");
  console.log("📂 Type:", isPDF ? "PDF" : "IMAGE");

  let fullText = '';

  try {
    if (isPDF) {
      // ✅ CORRECT WAY FOR PDF
      const content = fs.readFileSync(filePath).toString('base64');

      const [result] = await client.batchAnnotateFiles({
        requests: [
          {
            inputConfig: {
              content,
              mimeType: 'application/pdf',
            },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          },
        ],
      });

      const pages = result.responses?.[0]?.responses || [];

      console.log("📑 Pages detected:", pages.length);

      fullText = pages
        .map((p) => p.fullTextAnnotation?.text || '')
        .join('\n');

    } else {
      // ✅ IMAGE OCR
      const [result] = await client.documentTextDetection(filePath);

      if (result.error) {
        throw new Error(result.error.message);
      }

      fullText = result.fullTextAnnotation?.text || '';
    }

    if (!fullText) {
      throw new Error('No text extracted from file');
    }

    console.log("📝 OCR Preview:\n", fullText.substring(0, 300));

    return fullText;

  } catch (err) {
    console.error("❌ OCR Failed:", err.message);
    throw new Error("OCR failed: " + err.message);
  }
};


// ---------------- SIMPLE ANSWER PARSER ----------------

const parseAnswers = (text, questions) => {
  const result = {};

  questions.forEach((q, i) => {
    const nextQ = questions[i + 1]?.questionNumber;

    const regex = new RegExp(
      `Q${q.questionNumber}[\\s\\S]*?(?=Q${nextQ}|$)`,
      'i'
    );

    const match = text.match(regex);

    result[`q${q.questionNumber}`] = match
      ? match[0].replace(/Q\d+/i, '').trim()
      : 'No answer detected';
  });

  return result;
};


// ---------------- MAIN FUNCTION ----------------

const extractText = async (filePath, questions) => {
  console.log("🚀 Starting OCR pipeline...");

  const rawText = await googleOCR(filePath);

  console.log("🔍 Parsing answers...");

  const structured = parseAnswers(rawText, questions);

  console.log("✅ OCR + Parsing complete");

  return structured;
};


module.exports = { extractText };