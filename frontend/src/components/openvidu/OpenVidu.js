import React, { useState, useEffect, useCallback } from 'react';
import {
    LocalVideoTrack,
    RemoteParticipant,
    RemoteTrack,
    RemoteTrackPublication,
    Room,
    RoomEvent
} from 'livekit-client';
import './OpenVidu.css';
import VideoComponent from './VideoComponent';
import AudioComponent from './AudioComponent';

let APPLICATION_SERVER_URL = '';
let LIVEKIT_URL = '';
configureUrls();

function configureUrls() {
    if (!APPLICATION_SERVER_URL) {
        if (window.location.hostname === 'localhost') {
            APPLICATION_SERVER_URL = 'http://localhost:6080/';
        } else {
            APPLICATION_SERVER_URL = 'https://' + window.location.hostname + ':6443/';
        }
    }

    if (!LIVEKIT_URL) {
        if (window.location.hostname === 'localhost') {
            LIVEKIT_URL = 'ws://localhost:7880/';
        } else {
            LIVEKIT_URL = 'wss://' + window.location.hostname + ':7443/';
        }
    }
}

function OpenVidu() {
    const [room, setRoom] = useState(undefined);
    const [localTrack, setLocalTrack] = useState(undefined);
    const [remoteTracks, setRemoteTracks] = useState([]);
    const [expressions, setExpressions] = useState({});

    const [participantName, setParticipantName] = useState('Participant' + Math.floor(Math.random() * 100));
    const [roomName, setRoomName] = useState('Test Room');
    
    const handleExpressionDetected = useCallback((participantIdentity, expression) => {
        setExpressions(prev => ({ ...prev, [participantIdentity]: expression }));
    }, []);

    async function joinRoom() {
        const room = new Room();
        setRoom(room);

        room.on(
            RoomEvent.TrackSubscribed,
            (_track, publication, participant) => {
                setRemoteTracks((prev) => [
                    ...prev,
                    { trackPublication: publication, participantIdentity: participant.identity }
                ]);
            }
        );

        room.on(RoomEvent.TrackUnsubscribed, (_track, publication) => {
            setRemoteTracks((prev) => prev.filter((track) => track.trackPublication.trackSid !== publication.trackSid));
        });

        try {
            const token = await getToken(roomName, participantName);
            await room.connect(LIVEKIT_URL, token);
            await room.localParticipant.enableCameraAndMicrophone();
            setLocalTrack(room.localParticipant.videoTrackPublications.values().next().value.videoTrack);
        } catch (error) {
            console.log('There was an error connecting to the room:', error.message);
            await leaveRoom();
        }
    }

    async function leaveRoom() {
        await room?.disconnect();
        setRoom(undefined);
        setLocalTrack(undefined);
        setRemoteTracks([]);
    }

    async function getToken(roomName, participantName) {
        const response = await fetch(APPLICATION_SERVER_URL + 'token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: "application/json",
            },
            body: JSON.stringify({
                roomName: roomName,
                participantName: participantName
            })
        });
    
        if (!response.ok) {
            const errorText = await response.text();  // 텍스트 형식으로 오류 내용을 가져옵니다
            console.error(`Failed to get token: ${errorText}`);
            throw new Error(`Failed to get token: HTTP status ${response.status}`);
        }
    
        const data = await response.json();
        return data.token;
    }
    

    return (
        <>
            {!room ? (
                <div id='join'>
                    <div id='join-dialog'>
                        <h2>Join a Video Room</h2>
                        <form
                            onSubmit={(e) => {
                                joinRoom();
                                e.preventDefault();
                            }}
                        >
                            <div>
                                <label htmlFor='participant-name'>Participant</label>
                                <input
                                    id='participant-name'
                                    className='form-control'
                                    type='text'
                                    value={participantName}
                                    onChange={(e) => setParticipantName(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor='room-name'>Room</label>
                                <input
                                    id='room-name'
                                    className='form-control'
                                    type='text'
                                    value={roomName}
                                    onChange={(e) => setRoomName(e.target.value)}
                                    required
                                />
                            </div>
                            <button
                                className='btn btn-lg btn-success'
                                type='submit'
                                disabled={!roomName || !participantName}
                            >
                                Join!
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                <div id='room'>
                    <div id='room-header'>
                        <h2 id='room-title'>{roomName}</h2>
                        <button className='btn btn-danger' id='leave-room-button' onClick={leaveRoom}>
                            Leave Room
                        </button>
                    </div>
                    <div id='layout-container'>
                        {localTrack && (
                            <VideoComponent
                                track={localTrack}
                                participantIdentity={participantName}
                                local={true}
                                onExpressionDetected={handleExpressionDetected}
                            />
                        )}
                        {remoteTracks.map((remoteTrack) =>
                            remoteTrack.trackPublication.kind === 'video' ? (
                                <VideoComponent
                                    key={remoteTrack.trackPublication.trackSid}
                                    track={remoteTrack.trackPublication.videoTrack}
                                    participantIdentity={remoteTrack.participantIdentity}
                                    onExpressionDetected={handleExpressionDetected}
                                />
                            ) : (
                                <AudioComponent
                                    key={remoteTrack.trackPublication.trackSid}
                                    track={remoteTrack.trackPublication.audioTrack}
                                />
                            )
                        )}
                        <div>
                            {Object.entries(expressions).map(([participant, expression]) => (
                                <p key={participant}>{participant}: {expression}</p>  // 참가자의 얼굴 표정을 화면에 표시
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default OpenVidu;
