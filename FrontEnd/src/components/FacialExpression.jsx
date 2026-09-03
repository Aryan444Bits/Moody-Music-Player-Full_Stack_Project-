import React, { useEffect, useRef, useState, useContext } from 'react';
import * as faceapi from 'face-api.js';
import "./facialExpression.css";
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';

export default function FacialExpression({ setSongs, setLoading, setMood }) {
    const videoRef = useRef();
    const [status, setStatus] = useState('ready'); // ready, detecting, fetching, error
    const { token } = useContext(AuthContext);

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
        
        setStatus('detecting');
        setLoading(true);

        const detections = await faceapi
            .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();

        if (!detections || detections.length === 0) {
            console.log("No face detected");
            setStatus('ready');
            setLoading(false);
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

        setMood(mostProbableExpression);
        setStatus('fetching');

        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

        axios.get(`http://localhost:3000/api/recommendations?mood=${mostProbableExpression}`, config)
        .then(response => {
            console.log("Recommendation API Response:", response.data);
            setSongs(response.data.songs || []);
            setLoading(false);
            setStatus('ready');
        })
        .catch(err => {
            console.error("Recommendation fetch error, falling back:", err);
            // Fallback to standard songs endpoint if needed
            axios.get(`http://localhost:3000/songs?mood=${mostProbableExpression}`, config)
            .then(res => {
                setSongs(res.data.songs || []);
            })
            .catch(e => console.error(e))
            .finally(() => {
                setLoading(false);
                setStatus('ready');
            });
        });
    }

    useEffect(() => {
        loadModels().then(() => {
            startVideo();
        });
    }, []);

    return (
        <div className='mood-elem'>
            <h1>Moody <span className='span-elem'>Music</span> Player</h1>
            <div className="video-wrapper" style={{ position: 'relative', width: 'fit-content', margin: '0 auto' }}>
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    className='user-video-feed'
                    style={{ display: 'block' }}
                />
                <AnimatePresence>
                    {status === 'detecting' && (
                        <motion.div 
                            className="detecting-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="scanner"></div>
                            <p>Detecting User Mood...</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <br />
            <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={detectMood}
                disabled={status !== 'ready'}
                style={{ marginLeft: 0 }}
            >
                {status === 'detecting' ? 'Analyzing...' : 'Detect Mood'}
            </motion.button>
        </div>
    );
}
