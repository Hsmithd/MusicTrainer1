import React, { useState } from 'react';
import './Home.css';
import ScoreViewer from './MidiScoreViewer';
import { Wand2 } from 'lucide-react';

function Home() {
    const [abcNotation, setAbcNotation] = useState("C2 C2 | G2 G2 | A2 A2 | G4 | G2 G2 | A2 A2 | G4 | G2 G2 | A2 A2 | G4 |");
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch('/api/generate-etude/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({})
            });

            const data = await response.json();

            if (data.success) {
                // Extract the first tune from the generated ABC content
                const tunes = data.abc_notation.split('\n\n');
                if (tunes.length > 0) {
                    // Get the first tune and remove the X: header line for display
                    const firstTune = tunes[0].split('\n').slice(1).join('\n');
                    setAbcNotation(firstTune);
                }
            } else {
                console.error('Generation failed:', data.error);
                alert('Failed to generate etude: ' + data.error);
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
                    <a href="#home" className="nav-link active">Home</a>
                    <a href="#practice" className="nav-link">Ear Training</a>
                    <a href="#stats" className="nav-link">Statistics</a>
                    <a href="#profile" className="nav-link">Profile</a>
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
                    <ScoreViewer abcNotation={abcNotation} />
                </div>
            </section>

            {/* Action Buttons */}
            <section className="action-section">
                <div className="button-grid">

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