import mongoose from "mongoose";
const quizSchema = new mongoose.Schema({
  userId: String,
  quizId: Number,
  score: Number,
  trophyLevel: Number,
  accuracy: String,
  speed: String,
  finalScore: Number,
  negativeScore: Number,
  correctAnswers: Number,
  incorrectAnswers: Number,
  totalQuestions: Number,
  rankText: String,
  responseMap: Object,
  topic: String,
  difficulty: String,
  submittedAt: Date,
});
const Quiz = mongoose.model("Quiz", quizSchema);
export default Quiz;
