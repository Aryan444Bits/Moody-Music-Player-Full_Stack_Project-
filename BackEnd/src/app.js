const express = require("express");
const songRoutes = require("./routes/song.routes")
const cors = require("cors")


const app = express();
app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://moody-music-frontend.onrender.com"
    ],
    credentials: true
}));
app.use(express.json())


app.use('/', songRoutes)

module.exports = app;