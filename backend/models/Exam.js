const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  questionNumber: { type: Number, required: true },
  questionText: { type: String, required: true },
  maxMarks: { type: Number, required: true },
  modelAnswer: { type: String, required: true },
});

const examSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    totalMarks: { type: Number, required: true },
    questions: [questionSchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Exam", examSchema);
