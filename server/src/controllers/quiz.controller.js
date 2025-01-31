import asyncHandler from "../utils/asyncHandler.js";
import collegeRankMapping from "../utils/colleges.js";
import Quiz from "../models/quiz.model.js";
import axios from "axios";
import ApiError from "../utils/apiError.js";

const predictCollege = (predictedRank) => {
  for (const { rankRange, college } of collegeRankMapping) {
    if (predictedRank >= rankRange[0] && predictedRank <= rankRange[1]) {
      return college;
    }
  }
  return "No suitable college found";
};

const calculateRankPrediction = (quizHistory) => {
  let totalScore = 0;
  let totalAccuracy = 0;
  let topicScores = {};
  quizHistory.forEach((quizEntry) => {
    totalScore += quizEntry.score;
    totalAccuracy += quizEntry.accuracy;

    if (!topicScores[quizEntry.quiz.topic]) {
      topicScores[quizEntry.quiz.topic] = { total: 0, count: 0 };
    }
    topicScores[quizEntry.quiz.topic].total += quizEntry.score;
    topicScores[quizEntry.quiz.topic].count++;
  });

  const averageScore = totalScore / quizHistory.length;
  const averageAccuracy = totalAccuracy / quizHistory.length;
  let predictedRank;
  if (averageScore >= 90 && averageAccuracy >= 85) {
    predictedRank = 100;
  } else if (averageScore >= 75 && averageAccuracy >= 70) {
    predictedRank = 500;
  } else if (averageScore >= 50 && averageAccuracy >= 60) {
    predictedRank = 1000;
  } else {
    predictedRank = 10000;
  }
  const predictedCollege = predictCollege(predictedRank);
  return {
    predictedCollege,
    predictedRank,
  };
};

const identifyWeakAreas = (quizHistory) => {
  let weakAreas = [];

  const topicScores = {};
  quizHistory.forEach((quizEntry) => {
    if (!topicScores[quizEntry.quiz.topic]) {
      topicScores[quizEntry.quiz.topic] = { totalScore: 0, count: 0 };
    }
    topicScores[quizEntry.quiz.topic].totalScore += quizEntry.score;
    topicScores[quizEntry.quiz.topic].count++;
  });

  Object.keys(topicScores).forEach((topic) => {
    const avgScore = topicScores[topic].totalScore / topicScores[topic].count;
    if (avgScore < 50) {
      weakAreas.push(topic);
    }
  });

  return weakAreas;
};

const parseAccuracy = (accuracy) => {
  if (typeof accuracy === "string") {
    const parsedValue = parseFloat(accuracy.replace("%", "").trim());
    return isNaN(parsedValue) ? null : parsedValue; // Return null if parsing fails
  }
  return null;
};

const trackImprovementTrends = (quizHistory) => {
  const trends = [];

  quizHistory.forEach((quizEntry, index) => {
    if (index > 0) {
      const previousQuiz = quizHistory[index - 1];

      const previousAccuracy = parseAccuracy(previousQuiz.accuracy);
      const currentAccuracy = parseAccuracy(quizEntry.accuracy);

      let accuracyChange = null;
      if (currentAccuracy !== null && previousAccuracy !== null) {
        accuracyChange =
          ((currentAccuracy - previousAccuracy) / previousAccuracy) * 100;
      }

      const trend = {
        quizId: quizEntry.quiz_id,
        scoreChange: quizEntry.score - previousQuiz.score,
        accuracyChange: accuracyChange,
      };

      trends.push(trend);
    }
  });

  return trends;
};

const quizResponse = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const response = await axios.get(`${process.env.QUIZ_API_URL}/${userId}`);
  const quizData = response.data;
  const quiz = new Quiz({
    userId: quizData.user_id,
    quizId: quizData.quiz_id,
    score: quizData.score,
    trophyLevel: quizData.trophy_level,
    accuracy: quizData.accuracy,
    speed: quizData.speed,
    finalScore: quizData.final_score,
    negativeScore: quizData.negative_score,
    correctAnswers: quizData.correct_answers,
    incorrectAnswers: quizData.incorrect_answers,
    totalQuestions: quizData.total_questions,
    rankText: quizData.rank_text,
    responseMap: quizData.response_map,
    topic: quizData.quiz.topic,
    difficulty: quizData.quiz.difficulty_level,
    submittedAt: quizData.submitted_at,
  });
  await quiz.save();
  const rankPrediction = calculateRankPrediction([quizData]);
  res.status(201).json({
    message: "Quiz data saved successfully",
    rankPrediction: rankPrediction.predictedRank,
    predictCollege: rankPrediction.predictedCollege,
    quiz,
  });

  if (!quiz) {
    throw new ApiError(404, "quiz not found");
  }
});
const quizHistory = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    const response = await axios.get(`${process.env.QUIZ_API_URL}/${userId}`);
    const historyData = response.data;

    if (!historyData || historyData.length === 0) {
      return res
        .status(404)
        .json({ message: "No quiz history found for this user." });
    }

    const totalScore = historyData.reduce(
      (sum, quizEntry) => sum + quizEntry.score,
      0
    );
    const averageScore = totalScore / historyData.length;
    console.log(totalScore);
    const topicPerformance = {};

    historyData.forEach((quizEntry) => {
      if (!topicPerformance[quizEntry?.quiz?.topic]) {
        topicPerformance[quizEntry?.quiz?.topic] = { total: 0, count: 0 };
      }
      topicPerformance[quizEntry?.quiz?.topic].total += quizEntry.score;
      topicPerformance[quizEntry?.quiz?.topic].count++;
    });

    Object.keys(topicPerformance).forEach((topic) => {
      topicPerformance[topic].average =
        topicPerformance[topic].total / topicPerformance[topic].count;
    });
    const rankPrediction = calculateRankPrediction(historyData);
    const weakAreas = identifyWeakAreas(historyData);
    const improvementTrends = trackImprovementTrends(historyData);
    res.json({
      rankPrediction: rankPrediction.predictedRank,
      predictedCollege: rankPrediction.predictedCollege,
      weakAreas,
      improvementTrends,
      averageScore,
      topicPerformance,
      historyData,
    });
  } catch (error) {
    console.error("Error fetching quiz history:", error);
    res
      .status(error.response?.status || 500)
      .json({ message: "Server error in quiz history." });
  }
});

export { quizResponse, quizHistory };
