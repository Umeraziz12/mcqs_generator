import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Calendar, Award, BookOpen, CheckCircle, BarChart2 } from 'lucide-react';

interface UserStats {
  total_quizzes: number;
  total_attempts: number;
  average_score: number;
  quizzes_by_difficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
}

const ProfilePage: React.FC = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:8000/users/me/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchStats();
    }
  }, [token]);

  if (isLoading) {
    return <div className="loading-container">Loading profile...</div>;
  }

  return (
    <div className="profile-page">
      <header className="page-header">
        <h1>Your Profile</h1>
        <p>Manage your account and view your learning progress.</p>
      </header>

      <div className="profile-grid">
        <section className="profile-section user-info-card">
          <div className="user-avatar-large">
            {user?.username.charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <div className="detail-item">
              <User size={20} />
              <span><strong>Username:</strong> {user?.username}</span>
            </div>
            <div className="detail-item">
              <Mail size={20} />
              <span><strong>Email:</strong> {user?.email}</span>
            </div>
            <div className="detail-item">
              <Calendar size={20} />
              <span><strong>Joined:</strong> {user ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
        </section>

        <section className="profile-section stats-overview">
          <h2><BarChart2 className="section-icon" /> Performance Overview</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <BookOpen className="stat-icon quizzes" />
              <div className="stat-content">
                <span className="stat-value">{stats?.total_quizzes || 0}</span>
                <span className="stat-label">Quizzes Generated</span>
              </div>
            </div>
            <div className="stat-card">
              <CheckCircle className="stat-icon attempts" />
              <div className="stat-content">
                <span className="stat-value">{stats?.total_attempts || 0}</span>
                <span className="stat-label">Total Attempts</span>
              </div>
            </div>
            <div className="stat-card">
              <Award className="stat-icon score" />
              <div className="stat-content">
                <span className="stat-value">{Math.round(stats?.average_score || 0)}%</span>
                <span className="stat-label">Average Score</span>
              </div>
            </div>
          </div>
        </section>

        <section className="profile-section difficulty-stats">
          <h2>Difficulty Breakdown</h2>
          <div className="difficulty-bars">
            <div className="diff-bar-item">
              <div className="diff-info">
                <span>Easy</span>
                <span>{stats?.quizzes_by_difficulty.easy || 0}</span>
              </div>
              <div className="progress-bg">
                <div 
                  className="progress-fill easy" 
                  style={{ width: `${(stats?.quizzes_by_difficulty.easy || 0) / (stats?.total_quizzes || 1) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="diff-bar-item">
              <div className="diff-info">
                <span>Medium</span>
                <span>{stats?.quizzes_by_difficulty.medium || 0}</span>
              </div>
              <div className="progress-bg">
                <div 
                  className="progress-fill medium" 
                  style={{ width: `${(stats?.quizzes_by_difficulty.medium || 0) / (stats?.total_quizzes || 1) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="diff-bar-item">
              <div className="diff-info">
                <span>Hard</span>
                <span>{stats?.quizzes_by_difficulty.hard || 0}</span>
              </div>
              <div className="progress-bg">
                <div 
                  className="progress-fill hard" 
                  style={{ width: `${(stats?.quizzes_by_difficulty.hard || 0) / (stats?.total_quizzes || 1) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProfilePage;
