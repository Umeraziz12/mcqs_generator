import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, CheckCircle, XCircle, HelpCircle } from 'lucide-react';

interface Question {
  id: number;
  text: string;
  options: string[];
  answer: string;
  explanation: string;
}

interface AttemptDetail {
  id: number;
  score: number;
  total: number;
  answers: { [key: string]: string };
  timestamp: string;
  quiz: {
    id: number;
    title: string;
    difficulty: string;
    questions: Question[];
  };
}

const ResultView: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAttempt = async () => {
      try {
        const response = await fetch(`http://localhost:8000/attempts/${attemptId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setAttempt(data);
        }
      } catch (error) {
        console.error("Error fetching attempt:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (token && attemptId) {
      fetchAttempt();
    }
  }, [token, attemptId]);

  if (isLoading) {
    return <div className="loading-container">Loading result...</div>;
  }

  if (!attempt) {
    return (
      <div className="error-container">
        <h2>Attempt not found</h2>
        <button onClick={() => navigate('/history')} className="secondary-btn">Back to History</button>
      </div>
    );
  }

  const percentage = Math.round((attempt.score / attempt.total) * 100);

  return (
    <div className="result-view-page">
      <div className="result-view-header">
        <button className="back-btn" onClick={() => navigate('/history')}>
          <ArrowLeft size={20} /> Back to History
        </button>
        <h1>Quiz Result</h1>
        <p className="quiz-title">{attempt.quiz.title}</p>
      </div>

      <div className="result-summary-card">
        <div className="score-main">
          <div className="score-circle-large">
            <span className="percent">{percentage}%</span>
            <span className="fraction">{attempt.score} / {attempt.total}</span>
          </div>
          <div className="score-text">
            <h2>{percentage >= 70 ? 'Great job!' : percentage >= 40 ? 'Good effort!' : 'Keep practicing!'}</h2>
            <p>Completed on {new Date(attempt.timestamp).toLocaleString()}</p>
            <span className={`difficulty-badge ${attempt.quiz.difficulty}`}>{attempt.quiz.difficulty}</span>
          </div>
        </div>
      </div>

      <div className="detailed-review">
        <h3>Question Review</h3>
        <div className="review-list">
          {attempt.quiz.questions.map((q, index) => {
            const userAnswer = attempt.answers[q.text];
            const isCorrect = userAnswer === q.answer;

            return (
              <div key={q.id} className={`review-card ${isCorrect ? 'correct' : 'incorrect'}`}>
                <div className="review-card-header">
                  <span className="q-number">Question {index + 1}</span>
                  {isCorrect ? (
                    <span className="status correct"><CheckCircle size={18} /> Correct</span>
                  ) : (
                    <span className="status incorrect"><XCircle size={18} /> Incorrect</span>
                  )}
                </div>
                
                <p className="q-text">{q.text}</p>
                
                <div className="options-review">
                  {q.options.map((option, idx) => {
                    let className = "option-review-item";
                    if (option === q.answer) className += " correct";
                    if (option === userAnswer && !isCorrect) className += " incorrect";
                    
                    return (
                      <div key={idx} className={className}>
                        <span className="opt-label">{String.fromCharCode(65 + idx)}</span>
                        {option}
                        {option === q.answer && <span className="marker">✓</span>}
                        {option === userAnswer && !isCorrect && <span className="marker">✗</span>}
                      </div>
                    );
                  })}
                </div>

                <div className="explanation-section">
                  <h4><HelpCircle size={16} /> Explanation:</h4>
                  <p>{q.explanation}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="result-view-actions">
        <button onClick={() => navigate('/dashboard')} className="secondary-btn">Go to Dashboard</button>
        <button onClick={() => navigate('/generator')} className="primary-btn">Generate New Quiz</button>
      </div>
    </div>
  );
};

export default ResultView;
