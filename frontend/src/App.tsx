import React, { useState, ChangeEvent, useEffect } from 'react';
import './App.css';

interface Question {
  id: number;
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

type QuizMode = 'setup' | 'learning' | 'challenge';
type View = 'landing' | 'dashboard' | 'quiz' | 'flashcards';

function App() {
  const [view, setView] = useState<View>('landing');
  const [quizMode, setQuizMode] = useState<QuizMode>('setup');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [numQuestions, setNumQuestions] = useState<number>(5); // New state for number of questions
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string | null }>({});
  const [timeLeft, setTimeLeft] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isQuizStarted, setIsQuizStarted] = useState(false);

  // Flashcard state
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timerActive && timeLeft > 0 && !showScore) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      setShowScore(true);
      setTimerActive(false);
    }
    return () => clearInterval(timer);
  }, [timerActive, timeLeft, showScore]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setSelectedFile(file);
      setQuestions([]); 
      setIsQuizStarted(false);
      setQuizMode('setup');
      setView('quiz');
    }
  };

  const handleGenerateMCQs = async () => {
    if (!selectedFile) return;
    
    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('difficulty', difficulty);
    formData.append('num_questions', numQuestions.toString()); // Include numQuestions

    try {
      const response = await fetch('http://localhost:8000/generate-mcqs/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const formattedQuestions = data.map((q: any, index: number) => ({
        id: index + 1,
        questionText: q.question,
        options: q.options,
        correctAnswer: q.answer,
        explanation: q.explanation,
      }));
      
      setQuestions(formattedQuestions);
      setCurrentFlashcardIndex(0);
      setIsFlipped(false);
      alert("MCQs generated successfully! Choose your mode and launch.");
    } catch (error) {
      console.error("Error generating MCQs:", error);
      alert("Failed to generate MCQs from the PDF. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeChange = (mode: QuizMode) => {
    setQuizMode(mode);
  };

  const handleOptionClick = (option: string) => {
    if (showScore) return;
    
    if (quizMode === 'learning' && userAnswers[questions[currentQuestionIndex].id] !== undefined) return;

    setSelectedOption(option);
    
    if (quizMode === 'learning') {
      setUserAnswers((prev) => ({ ...prev, [questions[currentQuestionIndex].id]: option }));
      if (option === questions[currentQuestionIndex].correctAnswer) {
        setScore((prev) => prev + 1);
      }
    }
  };

  const handleNextQuestion = () => {
    const currentQuestion = questions[currentQuestionIndex];
    
    if (quizMode === 'challenge') {
      setUserAnswers((prev) => ({ ...prev, [currentQuestion.id]: selectedOption }));
      if (selectedOption === currentQuestion.correctAnswer) {
        setScore((prev) => prev + 1);
      }
    }

    setSelectedOption(null);
    const nextQuestion = currentQuestionIndex + 1;
    if (nextQuestion < questions.length) {
      setCurrentQuestionIndex(nextQuestion);
    } else {
      setShowScore(true);
      setTimerActive(false);
    }
  };

  const handleStartQuiz = () => {
    if (questions.length > 0) {
        setCurrentQuestionIndex(0);
        setScore(0);
        setShowScore(false);
        setSelectedOption(null);
        setUserAnswers({});
        setTimeLeft(60);
        setIsQuizStarted(true);
        setTimerActive(quizMode === 'challenge');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const LandingPage = () => (
    <div className="landing-page">
      <section className="hero">
        <div className="hero-content">
          <h1>Master Your Studies with AI-Powered MCQs</h1>
          <p>Upload your PDFs and instantly generate high-quality multiple-choice questions to test your knowledge.</p>
          <button className="cta-button" onClick={() => setView('dashboard')}>Get Started for Free</button>
        </div>
      </section>

      <section id="features" className="features">
        <h2>Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>AI Extraction</h3>
            <p>Automatically extract key concepts and facts from any PDF document.</p>
          </div>
          <div className="feature-card">
            <h3>Multiple Modes</h3>
            <p>Choose between Learning Mode for instant feedback or Challenge Mode to test yourself.</p>
          </div>
          <div className="feature-card">
            <h3>Progress Tracking</h3>
            <p>Monitor your performance and see how you improve over time.</p>
          </div>
        </div>
      </section>
    </div>
  );

  const Dashboard = () => (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Welcome Back, Scholar!</h1>
        <p>Your personalized learning hub.</p>
      </header>
      
      <div className="dashboard-grid">
        <div className="dashboard-card upload-card" onClick={() => document.getElementById('dash-upload')?.click()}>
          <div className="card-icon">📁</div>
          <h3>Upload PDF</h3>
          <p>Generate new MCQs from a document.</p>
          <input 
            type="file" 
            id="dash-upload" 
            style={{ display: 'none' }} 
            accept=".pdf" 
            onChange={handleFileChange} 
          />
        </div>

        <div className="dashboard-card" onClick={() => { setView('quiz'); setIsQuizStarted(false); setQuizMode('setup'); }}>
          <div className="card-icon">📝</div>
          <h3>View Quizzes</h3>
          <p>Review your generated question sets.</p>
        </div>

        <div className="dashboard-card" onClick={() => setView('flashcards')}>
          <div className="card-icon">📇</div>
          <h3>View Flashcards</h3>
          <p>Study key concepts with AI flashcards.</p>
        </div>

        <div className="dashboard-card">
          <div className="card-icon">📊</div>
          <h3>View Results</h3>
          <p>Check your past performance and scores.</p>
        </div>
      </div>

      <section className="recent-activity">
        <h3>Recent Activity</h3>
        <div className="activity-list">
          <p className="empty-state">No recent activity. Start by uploading a PDF!</p>
        </div>
      </section>
    </div>
  );

  const FlashcardsPage = () => (
    <div className="flashcards-page">
      <div className="flashcards-header">
        <button className="back-btn" onClick={() => setView('dashboard')}>← Back</button>
        <h2>Study Flashcards</h2>
        <div className="flashcard-counter">
          {currentFlashcardIndex + 1} / {questions.length > 0 ? questions.length : 0}
        </div>
      </div>

      {questions.length > 0 ? (
        <>
          <div className="flashcard-container">
            <div 
              className={`flashcard ${isFlipped ? 'flipped' : ''}`} 
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div className="flashcard-inner">
                <div className="flashcard-front">
                  <div className="card-label">Question</div>
                  <p className="flashcard-question-text">{questions[currentFlashcardIndex].questionText}</p>
                  <div className="card-hint">Click to flip</div>
                </div>
                <div className="flashcard-back">
                  <div className="card-label">Correct Answer</div>
                  <p className="flashcard-answer-text">{questions[currentFlashcardIndex].correctAnswer}</p>
                  {questions[currentFlashcardIndex].explanation && (
                    <div className="flashcard-explanation">
                      <p className="explanation-label">Explanation:</p>
                      <p className="explanation-text">{questions[currentFlashcardIndex].explanation}</p>
                    </div>
                  )}
                  <div className="card-hint">Click to see question</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flashcard-navigation">
            <button 
              className="nav-btn" 
              onClick={() => {
                setIsFlipped(false);
                setCurrentFlashcardIndex((prev) => (prev > 0 ? prev - 1 : questions.length - 1));
              }}
            >
              Previous
            </button>
            <button 
              className="nav-btn primary" 
              onClick={() => {
                setIsFlipped(false);
                setCurrentFlashcardIndex((prev) => (prev < questions.length - 1 ? prev + 1 : 0));
              }}
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <div className="empty-flashcards">
          <p>No questions generated yet. Upload a PDF in the Dashboard or Generator to create flashcards.</p>
          <button onClick={() => setView('quiz')} className="cta-button">Go to Generator</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="App">
      <nav className="navbar">
        <div className="navbar-brand">
          <h1 onClick={() => setView('landing')} style={{ cursor: 'pointer' }}>QuizGen AI</h1>
        </div>
        <ul className="navbar-nav">
          <li onClick={() => setView('landing')}><a href="#home">Home</a></li>
          <li onClick={() => setView('dashboard')}><a href="#dashboard">Dashboard</a></li>
          <li onClick={() => { setView('quiz'); setIsQuizStarted(false); setQuizMode('setup'); }}><a href="#quiz">Generator</a></li>
          <li onClick={() => setView('flashcards')}><a href="#flashcards">Flashcards</a></li>
        </ul>
        <div className="user-profile">
          <button className="login-btn">Profile</button>
        </div>
      </nav>

      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Generating your quiz...</p>
        </div>
      )}

      <main>
        {view === 'landing' ? (
          <LandingPage />
        ) : view === 'dashboard' ? (
          <Dashboard />
        ) : view === 'flashcards' ? (
          <FlashcardsPage />
        ) : (
          <div className="App-header">
            {!isQuizStarted ? (
              <div className="setup-container">
                <h2>Setup Your Quiz</h2>
                <div className="setup-steps">
                  <div className="step">
                    <span className="step-number">1</span>
                    <p>Upload your PDF</p>
                    <div className="pdf-upload-section">
                      <input type="file" id="file-upload" accept=".pdf" onChange={handleFileChange} hidden />
                      <label htmlFor="file-upload" className="file-label">
                        {selectedFile ? selectedFile.name : 'Choose a file...'}
                      </label>
                    </div>
                  </div>

                  <div className="step">
                    <span className="step-number">2</span>
                    <p>Select Quantity, Difficulty & Mode</p>
                    
                    <div className="quantity-selection">
                      <p className="selection-label">Number of Questions:</p>
                      <input 
                        type="number" 
                        min="1" 
                        max="20" 
                        value={numQuestions} 
                        onChange={(e) => setNumQuestions(parseInt(e.target.value))} 
                        className="num-questions-input"
                      />
                    </div>

                    <div className="difficulty-selection">
                      <p className="selection-label">Difficulty:</p>
                      <div className="difficulty-buttons">
                        {['easy', 'medium', 'hard'].map((level) => (
                          <button 
                            key={level}
                            className={`diff-btn ${difficulty === level ? 'active' : ''}`}
                            onClick={() => setDifficulty(level as any)}
                          >
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mode-selection-grid">
                      <div 
                        className={`mode-card ${quizMode === 'learning' ? 'active' : ''}`}
                        onClick={() => handleModeChange('learning')}
                      >
                        <h4>Learning Mode</h4>
                        <p>Get instant feedback on every answer.</p>
                      </div>
                      <div 
                        className={`mode-card ${quizMode === 'challenge' ? 'active' : ''}`}
                        onClick={() => handleModeChange('challenge')}
                      >
                        <h4>Challenge Mode</h4>
                        <p>Timed quiz with results at the end.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="setup-actions">
                  <button 
                      onClick={handleGenerateMCQs} 
                      disabled={!selectedFile || isLoading || numQuestions < 1}
                      className="secondary-btn"
                  >
                      {questions.length > 0 ? 'Regenerate MCQs' : 'Generate MCQs'}
                  </button>

                  <button 
                      onClick={handleStartQuiz} 
                      disabled={questions.length <= 0 || quizMode === 'setup'}
                      className="start-quiz-button"
                  >
                      Launch Quiz
                  </button>
                </div>
              </div>
            ) : showScore ? (
              <div className="score-section">
                <div className="score-header">
                  <h2>Quiz Complete!</h2>
                  <div className="score-circle">
                    <span className="final-score">{Math.round((score / questions.length) * 100)}%</span>
                    <p>{score} / {questions.length} Correct</p>
                  </div>
                </div>
                
                <div className="review-answers">
                    <h3>Performance Summary:</h3>
                    <div className="review-list">
                      {questions.map((q, index) => (
                          <div key={q.id} className={`review-item ${userAnswers[q.id] === q.correctAnswer ? 'correct' : 'incorrect'}`}>
                              <div className="review-q-text">
                                <strong>{index + 1}. {q.questionText}</strong>
                              </div>
                              <div className="review-details">
                                <p>Your Answer: <span>{userAnswers[q.id] || 'Skipped'}</span></p>
                                {userAnswers[q.id] !== q.correctAnswer && <p>Correct: <span className="correct-ans">{q.correctAnswer}</span></p>}
                              </div>
                          </div>
                      ))}
                    </div>
                </div>
                <div className="result-actions">
                  <button onClick={() => setView('dashboard')} className="secondary-btn">Back to Dashboard</button>
                  <button onClick={() => { setIsQuizStarted(false); setQuizMode('setup'); }} className="restart-quiz-button">Try Again</button>
                </div>
              </div>
            ) : (
              <div className="quiz-container">
                <div className="quiz-header">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}></div>
                  </div>
                  <div className="quiz-stats">
                    <span className="question-counter">Question {currentQuestionIndex + 1} of {questions.length}</span>
                    {quizMode === 'challenge' && (
                      <div className={`timer ${timeLeft < 10 ? 'warning' : ''}`}>
                        ⏱️ {formatTime(timeLeft)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="question-section">
                  <h2 className="question-text">
                    {questions[currentQuestionIndex].questionText}
                  </h2>
                </div>

                <div className="answer-section">
                  {questions[currentQuestionIndex].options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleOptionClick(option)}
                      className={`option-btn ${selectedOption === option ? 'selected' : ''} ${
                        quizMode === 'learning' && userAnswers[questions[currentQuestionIndex].id] !== undefined
                          ? option === questions[currentQuestionIndex].correctAnswer ? 'correct' : selectedOption === option ? 'incorrect' : ''
                          : ''
                      }`}
                      disabled={quizMode === 'learning' && userAnswers[questions[currentQuestionIndex].id] !== undefined}
                    >
                      <span className="option-label">{String.fromCharCode(65 + index)}</span>
                      {option}
                    </button>
                  ))}
                </div>

                {quizMode === 'learning' && selectedOption && (
                    <div className={`feedback-banner ${selectedOption === questions[currentQuestionIndex].correctAnswer ? 'success' : 'error'}`}>
                        {selectedOption === questions[currentQuestionIndex].correctAnswer 
                          ? '🎉 Correct! Well done.' 
                          : `❌ Incorrect. The correct answer is ${questions[currentQuestionIndex].correctAnswer}.`}
                          <p>{questions[currentQuestionIndex].explanation}</p>
                    </div>
                )}

                <div className="quiz-footer">
                  <button 
                    onClick={handleNextQuestion} 
                    disabled={selectedOption === null && quizMode === 'challenge'}
                    className="next-btn"
                  >
                    {currentQuestionIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="footer">
        <p>&copy; 2026 QuizGen AI. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;