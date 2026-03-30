import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Clock, ChevronRight, FileText, BarChart } from 'lucide-react';

interface Quiz {
  id: number;
  title: string;
  difficulty: string;
  topic: string;
  num_questions: number;
  created_at: string;
}

interface Attempt {
  id: number;
  quiz_id: number;
  score: number;
  total: number;
  timestamp: string;
}

const HistoryPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [quizzesRes, attemptsRes] = await Promise.all([
          fetch('http://localhost:8000/quizzes/', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://localhost:8000/attempts/', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (quizzesRes.ok && attemptsRes.ok) {
          const quizzesData = await quizzesRes.json();
          const attemptsData = await attemptsRes.json();
          setQuizzes(quizzesData);
          setAttempts(attemptsData);
        }
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return <div className="loading-container">Loading your history...</div>;
  }

  return (
    <div className="history-page">
      <header className="page-header">
        <h1>Your Learning History</h1>
        <p>Review your past quizzes and track your progress over time.</p>
      </header>

      <div className="history-tabs">
        <section className="history-section">
          <h2><FileText className="section-icon" /> Past Quizzes</h2>
          <div className="history-list">
            {quizzes.length > 0 ? (
              quizzes.map((quiz) => (
                <div key={quiz.id} className="history-item">
                  <div className="item-main">
                    <h3>{quiz.title}</h3>
                    <div className="item-meta">
                      <span className={`difficulty-badge ${quiz.difficulty}`}>{quiz.difficulty}</span>
                      <span className="topic-badge">{quiz.topic}</span>
                      <span className="date"><Clock size={14} /> {formatDate(quiz.created_at)}</span>
                    </div>
                  </div>
                  <div className="item-stats">
                    <span>{quiz.num_questions} Questions</span>
                    <button className="view-btn" onClick={() => navigate(`/quiz/${quiz.id}`)}>Review <ChevronRight size={16} /></button>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-state">No quizzes generated yet.</p>
            )}
          </div>
        </section>

        <section className="history-section">
          <h2><BarChart className="section-icon" /> Quiz Attempts</h2>
          <div className="history-list">
            {attempts.length > 0 ? (
              attempts.map((attempt) => {
                const quiz = quizzes.find(q => q.id === attempt.quiz_id);
                return (
                  <div key={attempt.id} className="history-item attempt-item">
                    <div className="item-main">
                      <h3>{quiz ? quiz.title : 'Deleted Quiz'}</h3>
                      <div className="item-meta">
                        <span className="date"><Clock size={14} /> {formatDate(attempt.timestamp)}</span>
                      </div>
                    </div>
                    <div className="item-score">
                      <div className="score-ring">
                        <span className="score-val">{Math.round((attempt.score / attempt.total) * 100)}%</span>
                      </div>
                      <span className="score-text">{attempt.score}/{attempt.total} Correct</span>
                      <button className="view-btn" onClick={() => navigate(`/results/${attempt.id}`)}>Review <ChevronRight size={16} /></button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="empty-state">No attempts recorded yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default HistoryPage;
