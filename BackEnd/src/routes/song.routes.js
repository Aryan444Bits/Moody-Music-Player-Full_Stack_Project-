const express = require("express")
const multer = require('multer');
const uploadFile = require("../service/storage.service");
const router = express.Router();
const songModel = require("../models/song.model")

const upload = multer({storage:multer.memoryStorage()}); // here multer is use the temprory memory storage to read the files

router.post("/songs",upload.single("audio"),async(req,res)=>{

    const fileData = await uploadFile(req.file) // uploading the file to imagekit (cloud storage provider)

    const song = await songmodel.create({
        title:req.body.title,
        artist:req.body.artist,
        audio:fileData.url,
        mood:req.body.mood
    })


    res.status(201).json({
        message:"Song Created Successfully",
        song: song
    });
})

router.get("/songs",async(req,res)=>{
    const {mood} = req.query;


    const songs = await songModel.find({
        mood:mood
    })

    res.status(200).json({
        message:"Songs Fteched Successfully",
        songs
    })
})

module.exports = router