const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { protect } = require("../middleware/auth");
const StudentSheet = require("../models/StudentSheet");

// GET /api/results/:id — Get a single student result
router.get("/:id", protect, async (req, res) => {
  const sheet = await StudentSheet.findById(req.params.id).populate("exam");
  if (!sheet) return res.status(404).json({ message: "Result not found" });
  res.json(sheet);
});

// GET /api/results/:id/pdf — Download student PDF report
router.get("/:id/pdf", protect, async (req, res) => {
  const sheet = await StudentSheet.findById(req.params.id);
  if (!sheet || !sheet.pdfUrl)
    return res
      .status(404)
      .json({ message: "PDF not found. Grade the sheet first." });

  const filePath = path.join(__dirname, "..", sheet.pdfUrl);
  if (!fs.existsSync(filePath))
    return res.status(404).json({ message: "PDF file missing on server" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="report_${sheet.studentName.replace(/\s+/g, "_")}.pdf"`,
  );
  fs.createReadStream(filePath).pipe(res);
});

// DELETE /api/results/:id — Delete a student sheet
router.delete("/:id", protect, async (req, res) => {
  const sheet = await StudentSheet.findByIdAndDelete(req.params.id);
  if (!sheet) return res.status(404).json({ message: "Result not found" });
  res.json({ message: "Deleted successfully" });
});

module.exports = router;
