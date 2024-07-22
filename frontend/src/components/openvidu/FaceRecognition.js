// src/components/FaceRecognition.js
import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import './FaceRecognition.css'; 
import joyImage from '../../assets/joy.png';
import sadnessImage from '../../assets/sadness.png';
import angerImage from '../../assets/anger.png';
import disgustImage from '../../assets/disgust.png';
import embrassmentImage from '../../assets/embrassment.png';
import fearImage from '../../assets/fear.png';
import ennuiImage from '../../assets/ennui.png';

// 트랙을 prop으로 받아오는 FaceRecognition 컴포넌트로 수정
const FaceRecognition = ({ track, onExpressionDetected }) => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [borderClass, setBorderClass] = useState('');
  const [imageSrc, setImageSrc] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = process.env.PUBLIC_URL + '/models';
      await faceapi.loadTinyFaceDetectorModel(MODEL_URL);
      await faceapi.loadFaceLandmarkModel(MODEL_URL);
      await faceapi.loadFaceExpressionModel(MODEL_URL);
      setIsModelLoaded(true);
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (videoRef.current && track) {
      track.attach(videoRef.current);
    }

    return () => {
      if (track) {
        track.detach(videoRef.current);
      }
    };
  }, [track]);

  useEffect(() => {
    const detectFace = async () => {
      if (
        videoRef.current &&
        videoRef.current.readyState === 4 &&
        isModelLoaded
      ) {
        const detections = await faceapi.detectAllFaces(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 512,
            scoreThreshold: 0.5
          })
        ).withFaceLandmarks().withFaceExpressions();

        if (detections.length > 0) {
          const expressions = detections[0].expressions;
          let detectedExpression = "";
          if (expressions.happy > 0.6) {
            setBorderClass('joy');
            setImageSrc(joyImage);
            detectedExpression = "태도: 행복";
          } else if (expressions.sad > 0.6) {
            setBorderClass('sadness');
            setImageSrc(sadnessImage);
            detectedExpression = "태도: 슬픔";
          } else if (expressions.angry > 0.6) {
            setBorderClass('anger');
            setImageSrc(angerImage);
            detectedExpression = "태도: 분노";
          } else if (expressions.disgusted > 0.6) {
            setBorderClass('disgust');
            setImageSrc(disgustImage);
            detectedExpression = "태도: 혐오";
          } else if (expressions.surprised > 0.6) {
            setBorderClass('embarrassment');
            setImageSrc(embrassmentImage);
            detectedExpression = "태도: 당혹";
          } else if (expressions.fear > 0.6) {
            setBorderClass('fear');
            setImageSrc(fearImage);
            detectedExpression = "태도: 두려움";
          } else if (expressions.neutral > 0.6) {
            setBorderClass('ennui');
            setImageSrc(ennuiImage);
            detectedExpression = "태도: 무표정";
          } else {
            setBorderClass('');
            setImageSrc(null);
          }

          // 감지된 표정을 부모 컴포넌트로 전달
          if (onExpressionDetected) {
            onExpressionDetected(detectedExpression);
          }
        } else {
          setImageSrc(null);
          setBorderClass('');
        }

        const displaySize = {
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight
        };

        if (canvasRef.current) {
          const context = canvasRef.current.getContext('2d', { willReadFrequently: true });
          faceapi.matchDimensions(canvasRef.current, displaySize);

          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
          faceapi.draw.drawFaceExpressions(canvasRef.current, resizedDetections);
        }
      }
    };

    const interval = setInterval(() => {
      detectFace();
    }, 500);

    return () => clearInterval(interval);
  }, [isModelLoaded]);

  return (
    <div className='myapp'>
      <div className='video-wrapper'>
        <video 
          ref={videoRef}
          className={`video-feed ${borderClass}`}
          autoPlay
          muted
        />
        <canvas 
          ref={canvasRef} 
          width="720" 
          height="560" 
          className="appcanvas">
        </canvas>
      </div>
      {imageSrc && <img src={imageSrc} alt="emotion" className="emotion-image" />}
    </div>
  );
};

export default FaceRecognition;
