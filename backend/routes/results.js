const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const StudentSheet = require("../models/StudentSheet");
const { openDownloadStream, deleteFile } = require("../utils/gridfs");

// GET /api/results/:id — Get a single student result
router.get("/:id", protect, async (req, res) => {
  const sheet = await StudentSheet.findById(req.params.id).populate("exam");
  if (!sheet) return res.status(404).json({ message: "Result not found" });
  res.json(sheet);
});

// GET /api/results/:id/pdf — Download student PDF report (streamed from GridFS)
router.get("/:id/pdf", protect, async (req, res) => {
  const sheet = await StudentSheet.findById(req.params.id);
  if (!sheet || !sheet.pdfFileId)
    return res
      .status(404)
      .json({ message: "PDF not found. Grade the sheet first." });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="report_${sheet.studentName.replace(/\s+/g, "_")}.pdf"`,
  );

  let stream;
  try {
    stream = openDownloadStream(sheet.pdfFileId);
  } catch (err) {
    return res.status(404).json({ message: "PDF file missing in storage" });
  }

  stream.on("error", () => {
    if (!res.headersSent) {
      res.status(404).json({ message: "PDF file missing in storage" });
    } else {
      res.end();
    }
  });

  stream.pipe(res);
});

// DELETE /api/results/:id — Delete a student sheet (and its GridFS files)
router.delete("/:id", protect, async (req, res) => {
  const sheet = await StudentSheet.findByIdAndDelete(req.params.id);
  if (!sheet) return res.status(404).json({ message: "Result not found" });

  // Best-effort cleanup of the associated GridFS files; a missing file
  // should never block the sheet record from being deleted.
  await Promise.all(
    [sheet.fileId, sheet.pdfFileId]
      .filter(Boolean)
      .map((id) => deleteFile(id).catch(() => {})),
  );

  res.json({ message: "Deleted successfully" });
});

module.exports = router;