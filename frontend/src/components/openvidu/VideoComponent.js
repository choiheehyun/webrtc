import React, { useEffect, useRef, useState } from "react";
import { LocalVideoTrack, RemoteVideoTrack } from "livekit-client";
import "./VideoComponent.css";
import FaceRecognition from './FaceRecognition';

function VideoComponent({ track, participantIdentity, local = false, onExpressionDetected }) {
    const videoElement = useRef(null);
    const [expression, setExpression] = useState("");

    useEffect(() => {
        if (videoElement.current) {
            track.attach(videoElement.current);
        }

        return () => {
            track.detach();
        };
    }, [track]);

    useEffect(() => {
        if (onExpressionDetected) {
            onExpressionDetected(participantIdentity, expression);  // 표정 데이터를 상위 컴포넌트로 콜백
        }
    }, [expression, onExpressionDetected]);

    return (
        <div id={"camera-" + participantIdentity} className="video-container">
            <div className="participant-data">
                <p>
                    {participantIdentity + (local ? " (You)" : "")}
                    {expression && `: ${expression}`}  {/* 표정을 표시 */}
                </p>
            </div>
            <video ref={videoElement} id={track.sid}></video>
            <FaceRecognition track={track} onExpressionDetected={setExpression} /> {/* 얼굴 인식 추가 */}
        </div>
    );
}

export default VideoComponent;
