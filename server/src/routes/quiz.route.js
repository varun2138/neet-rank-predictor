import { Router } from "express";
import dotnev from "dotenv";
import { quizResponse, quizHistory } from "../controllers/quiz.controller.js";
dotnev.config({
  path: "./.env",
});
const router = Router();
router.route("/fetch/:userId").get(quizResponse);
router.route("/history/:userId").get(quizHistory);

export default router;
