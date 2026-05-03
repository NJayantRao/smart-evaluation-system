const mongoose = require("mongoose");

const gradingResultSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId },
  questionNumber: Number,
  questionText: String,
  studentAnswer: String,
  marksAwarded: Number,
  maxMarks: Number,
  feedback: String,
});

const studentSheetSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    studentName: { type: String, required: true, trim: true },
    rollNumber: { type: String, required: true, trim: true },
    fileUrl: { type: String },
    ocrText: { type: mongoose.Schema.Types.Mixed, default: {} }, // { q1: "text", q2: "text" }
    status: {
      type: String,
      enum: ["uploaded", "ocr_done", "graded", "error"],
      default: "uploaded",
    },
    gradingResults: [gradingResultSchema],
    totalMarks: { type: Number, default: 0 },
    maxTotalMarks: { type: Number, default: 0 },
    pdfUrl: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("StudentSheet", studentSheetSchema);
