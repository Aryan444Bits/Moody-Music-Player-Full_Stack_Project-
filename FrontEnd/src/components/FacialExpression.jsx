import React, { useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';
import "./facialExpression.css"
import axios from 'axios';

export default function FacialExpression({setSongs}) {
    const videoRef = useRef();

    const loadModels = async () => {
        const MODEL_URL = '/models';
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
    };

    const startVideo = () => {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then((stream) => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            })
            .catch((err) => console.error("Error accessing webcam: ", err));
    };

    async function detectMood() {
        if (!videoRef.current) return;

        const detections = await faceapi
            .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();

        if (!detections || detections.length === 0) {
            console.log("No face detected");
            return;
        }

        let mostProbableExpression = null;
        let highestValue = 0;

        for (let exp in detections[0].expressions) {
            if (detections[0].expressions[exp] > highestValue) {
                highestValue = detections[0].expressions[exp];
                mostProbableExpression = exp;
            }
        }

        axios.get(`http://localhost:3000/songs?mood=${mostProbableExpression}`)
        .then(response => {
            console.log(response.data);
            setSongs(response.data.songs);
        })
        // console.log(mostProbableExpression);
        
    }

    useEffect(() => {
        loadModels().then(() => {
            startVideo();
        });
    }, []);

    return (
        <div className='mood-elem'>
            <h1>Moody <span className='span-elem'>Music</span> Player</h1>
            <video
                ref={videoRef}
                autoPlay
                muted
                className='user-video-feed'
            />
            <br />
            <button onClick={detectMood}>Detect Mood</button>
        </div>
    );
}
