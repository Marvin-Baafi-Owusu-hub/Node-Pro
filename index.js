const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const authRouter = require('./routers/authRouter');
const postsRouter = require('./routers/postsRouter');


const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

mongoose
    .connect(process.env.MONGO_URL)
    .then(() => {
    console.log("Database Connected");
})
    .catch((err) => {
    console.log(err);
});

app.use("/api/auth", authRouter);
app.use("/api/posts", postsRouter);
app.get("/", (req, res) => {
    res.json({ message: "Hey yo, server" });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log("listening...");
});
