import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';
import ScoreViewer from './MidiScoreViewer';
import { Wand2 } from 'lucide-react';

function Home() {
    const [abcNotation, setAbcNotation] = useState(
        "C2 C2 | G2 G2 | A2 A2 | G4 | G2 G2 | A2 A2 | G4 | G2 G2 | A2 A2 | G4 |"
    );
    const [isGenerating, setIsGenerating] = useState(false);

    // Difficulty slider states
    const [difficulty, setDifficulty] = useState(5);
    const [complexity, setComplexity] = useState(5);
    const [speed, setSpeed] = useState(5);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch('/api/generate-etude/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ difficulty, complexity, speed }),
            });

            const data = await response.json();

            if (data.success && data.abc_notation) {
                const tunes = data.abc_notation.split('\n\n');
                const firstTune = tunes.length > 0
                    ? tunes[0].split('\n').slice(1).join('\n')
                    : '';
                setAbcNotation(firstTune);
            } else {
                console.error('Generation failed:', data.error);
                alert('Failed to generate etude: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error generating etude:', error);
            alert('Error generating etude: ' + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="home-container">
            {/* Navigation Bar */}
            <nav className="navbar">
                <div className="nav-brand">
                    <span className="logo-icon">🎵</span>
                    MusicTrainer
                </div>
                <div className="nav-links">
                    <Link to="/home" className="nav-link">Home</Link>
                    <a href="#practice" className="nav-link">Ear Training</a>
                    <a href="#stats" className="nav-link">Statistics</a>
                    <Link to="/profile" className="nav-link">Profile</Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-content">
                    <h1 className="hero-title">Welcome to MusicTrainer</h1>
                </div>
            </section>

            {/* Score Viewer Section */}
            <section className="score-section">
                <div className="section-header">
                    <h2>Your Music Score</h2>
                    <div className="score-actions">
                        <p>Generate new etudes</p>
                        <button
                            className={`generate-button ${isGenerating ? 'generating' : ''}`}
                            onClick={handleGenerate}
                            disabled={isGenerating}
                        >
                            <Wand2 className="generate-icon" size={20} />
                            {isGenerating ? 'Generating...' : 'Generate Etude'}
                        </button>
                    </div>
                </div>
                <div className="score-container">
                    {ScoreViewer ? <ScoreViewer abcNotation={abcNotation} /> : <p>Loading ScoreViewer...</p>}
                </div>
            </section>

            {/* Footer */}
            <footer className="footer">
                <p>&copy; 2025 MusicTrainer. Start your musical journey today!</p>
            </footer>
        </div>
    );
}

export default Home;
