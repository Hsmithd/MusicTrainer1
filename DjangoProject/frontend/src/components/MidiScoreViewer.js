import React, { useState, useRef, useEffect } from 'react';
import ABCJS from 'abcjs';
import { Settings, Play, Pause, Square } from 'lucide-react';
import './MidiScoreViewer.css';

const TIME_SIGNATURES = [
    { numerator: 4, denominator: 4, display: "4/4" },
    { numerator: 3, denominator: 4, display: "3/4" },
    { numerator: 2, denominator: 4, display: "2/4" },
    { numerator: 6, denominator: 8, display: "6/8" },
    { numerator: 9, denominator: 8, display: "9/8" },
    { numerator: 12, denominator: 8, display: "12/8" }
];

const KEY_SIGNATURES = [
    { key: 'C', display: 'C Major' },
    { key: 'G', display: 'G Major' },
    { key: 'D', display: 'D Major' },
    { key: 'A', display: 'A Major' },
    { key: 'E', display: 'E Major' },
    { key: 'F', display: 'F Major' },
    { key: 'Bb', display: 'Bb Major' },
    { key: 'Eb', display: 'Eb Major' },
    { key: 'Am', display: 'A Minor' },
    { key: 'Em', display: 'E Minor' },
    { key: 'Bm', display: 'B Minor' },
    { key: 'Dm', display: 'D Minor' },
    { key: 'Gm', display: 'G Minor' }
];

const ScoreViewer = ({ abcNotation = '' }) => {
    const [timeSignature, setTimeSignature] = useState({ numerator: 4, denominator: 4 });
    const [selectedKey, setSelectedKey] = useState('C');
    const [tempo, setTempo] = useState(120);
    const [title, setTitle] = useState('New Score');
    const [showSettings, setShowSettings] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioInitialized, setAudioInitialized] = useState(false);
    const scoreRef = useRef(null);
    const synthRef = useRef(null);
    const visualObjRef = useRef(null);
    const audioContextRef = useRef(null);

    useEffect(() => {
        updateScore();
        // Clean up synth on unmount
        return () => {
            if (synthRef.current) {
                synthRef.current.stop();
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
        };
    }, [abcNotation, timeSignature, selectedKey, tempo, title]);

    const updateScore = () => {
        if (!scoreRef.current) return;

        const headerString = `X:1
T:${title}
M:${timeSignature.numerator}/${timeSignature.denominator}
L:1/8
Q:1/4=${tempo}
K:${selectedKey}
`;

        const fullNotation = headerString + (abcNotation || 'z4 |]');

        try {
            // Create the visual score
            const visualObj = ABCJS.renderAbc(scoreRef.current, fullNotation, {
                responsive: 'resize',
                add_classes: true,
                staffwidth: 600,
                scale: 0.8,
                paddingbottom: 40,
                paddingright: 40,
                paddingleft: 40,
                paddingtop: 40,
                wrap: {
                    minSpacing: 1.8,
                    maxSpacing: 2.7,
                    preferredMeasuresPerLine: 16
                },
                format: {
                    measurenumber: true,
                    vocalfont: "Arial 12",
                    composerfont: "Arial 14",
                    titlefont: "Arial 16",
                    tempofont: "Arial 12",
                    annotationfont: "Arial 10",
                    footerfont: "Arial 10",
                    headerfont: "Arial 10",
                    textfont: "Arial 12",
                    wordsfont: "Arial 12"
                }
            });

            // Store the visual object for audio initialization
            if (visualObj && visualObj.length > 0) {
                visualObjRef.current = visualObj[0];
                // Reset audio initialization when score changes
                setAudioInitialized(false);
            }
        } catch (error) {
            console.error("Error rendering score:", error);
        }
    };

    const initializeAudio = async () => {
        if (!visualObjRef.current) {
            console.error("No visual object available for audio");
            return false;
        }

        try {
            // Create audio context on user interaction
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }

            // Resume audio context if suspended
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            // Create synth if it doesn't exist
            if (!synthRef.current) {
                synthRef.current = new ABCJS.synth.CreateSynth();
            }

            // Initialize the synth with the current score
            await synthRef.current.init({
                audioContext: audioContextRef.current,
                visualObj: visualObjRef.current,
                millisecondsPerMeasure: (60000 / tempo) * timeSignature.numerator,
                options: {
                    program: 0, // Piano sound
                    midiTranspose: 0,
                    qpm: tempo
                }
            });

            setAudioInitialized(true);
            console.log("Audio initialized successfully");
            return true;
        } catch (error) {
            console.error("Audio initialization failed:", error);
            setAudioInitialized(false);
            return false;
        }
    };

    const handlePlayback = async () => {
        if (isPlaying) {
            // Stop playback
            if (synthRef.current) {
                synthRef.current.stop();
                setIsPlaying(false);
            }
            return;
        }

        try {
            // Initialize audio if not already done or if score changed
            if (!audioInitialized || !synthRef.current) {
                const initialized = await initializeAudio();
                if (!initialized) {
                    return;
                }
            }

            // Ensure audio context is running
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            // Start playback
            await synthRef.current.start();
            setIsPlaying(true);

            // Handle playback end
            const handleEnded = () => {
                setIsPlaying(false);
            };

            // Remove any existing event listeners
            if (synthRef.current.removeEventListener) {
                synthRef.current.removeEventListener('ended', handleEnded);
            }

            // Add new event listener
            if (synthRef.current.addEventListener) {
                synthRef.current.addEventListener('ended', handleEnded);
            }

        } catch (error) {
            console.error("Playback failed:", error);
            setIsPlaying(false);

            // Try to reinitialize audio on next attempt
            setAudioInitialized(false);
        }
    };

    const handleStop = () => {
        if (synthRef.current) {
            synthRef.current.stop();
            setIsPlaying(false);
        }
    };

    const handleTimeSignatureChange = (sig) => {
        setTimeSignature({
            numerator: sig.numerator,
            denominator: sig.denominator
        });
    };

    const downloadAbc = () => {
        const headerString = `X:1
T:${title}
M:${timeSignature.numerator}/${timeSignature.denominator}
L:1/8
Q:1/4=${tempo}
K:${selectedKey}
`;
        const fullNotation = headerString + (abcNotation || 'z4 |]');

        const blob = new Blob([fullNotation], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}.abc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="score-viewer">
            <div className="header">
                <h1 className="title">ABC Score Editor</h1>
                <div className="controls">
                    <button
                        className="playback-button"
                        onClick={handlePlayback}
                        title={isPlaying ? "Pause" : "Play"}
                        disabled={!visualObjRef.current}
                    >
                        {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                    </button>
                    <button
                        className="stop-button"
                        onClick={handleStop}
                        title="Stop"
                        disabled={!isPlaying}
                    >
                        <Square size={24} />
                    </button>
                    <button
                        className="settings-button"
                        onClick={() => setShowSettings(!showSettings)}
                        title="Settings"
                    >
                        <Settings size={24} />
                    </button>
                </div>
            </div>

            {showSettings && (
                <div className="settings-panel">
                    <div className="setting-group">
                        <label>Title:</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="setting-input"
                        />
                    </div>
                    <div className="setting-group">
                        <label>Tempo:</label>
                        <input
                            type="number"
                            value={tempo}
                            onChange={(e) => setTempo(parseInt(e.target.value))}
                            min="40"
                            max="208"
                            className="setting-input"
                        />
                    </div>
                    <div className="setting-group">
                        <label>Time Signature:</label>
                        <select
                            value={`${timeSignature.numerator}/${timeSignature.denominator}`}
                            onChange={(e) => {
                                const [num, den] = e.target.value.split('/');
                                handleTimeSignatureChange({
                                    numerator: parseInt(num),
                                    denominator: parseInt(den)
                                });
                            }}
                            className="setting-input"
                        >
                            {TIME_SIGNATURES.map((sig) => (
                                <option key={sig.display} value={sig.display}>
                                    {sig.display}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="setting-group">
                        <label>Key:</label>
                        <select
                            value={selectedKey}
                            onChange={(e) => setSelectedKey(e.target.value)}
                            className="setting-input"
                        >
                            {KEY_SIGNATURES.map((sig) => (
                                <option key={sig.key} value={sig.key}>
                                    {sig.display}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button onClick={downloadAbc} className="download-button">
                        Download ABC
                    </button>
                </div>
            )}
            <div ref={scoreRef} className="score-container"></div>

            {!audioInitialized && (
                <div className="audio-status">
                    <small>Audio will initialize on first play</small>
                </div>
            )}
        </div>
    );
};

export default ScoreViewer;