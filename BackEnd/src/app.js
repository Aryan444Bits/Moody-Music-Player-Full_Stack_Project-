const express = require("express");
const songRoutes = require("./routes/song.routes");
const authRoutes = require("./routes/auth.routes");
const historyRoutes = require("./routes/history.routes");
const feedbackRoutes = require("./routes/feedback.routes");
const recommendationRoutes = require("./routes/recommendation.routes");
const cors = require("cors");

const app = express();
app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "https://moody-music-frontend.onrender.com"
    ],
    credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/', songRoutes);

module.exports = app;