import express from "express";
import dotenv from "dotenv";
import connectDB from "./src/db/index.js";
import errorHandler from "./src/middlewares/globalError.js";
dotenv.config({
  path: "./.env",
});
const PORT = process.env.PORT || 5000;

const app = express();
app.use(express.json());

connectDB()
  .then(() => {
    app.get("/", (req, res) => {
      res.send("hello");
    });
    const server = app.listen(PORT, () => {
      console.log(`Application is listening at http://localhost:${PORT}`);
    });
    server.on("error", (err) => {
      console.error("SERVER ERROR !!! : ", err);
    });

    // global error handling
    app.use(errorHandler);
  })
  .catch((err) => {
    console.log("MongoDB connection failed  !!!", err || err.message);
  });

// routes import
import router from "./src/routes/quiz.route.js";

//routes declaration
app.use("/api/v1/quiz", router);
