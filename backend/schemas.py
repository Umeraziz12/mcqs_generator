from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Question schemas
class QuestionBase(BaseModel):
    text: str
    options: List[str]
    answer: str
    explanation: Optional[str] = None

class QuestionCreate(QuestionBase):
    pass

class Question(QuestionBase):
    id: int
    quiz_id: int

    class Config:
        from_attributes = True

# Quiz schemas
class QuizBase(BaseModel):
    title: str
    difficulty: str
    topic: Optional[str] = None
    num_questions: int

class QuizCreate(QuizBase):
    pass

class Quiz(QuizBase):
    id: int
    user_id: int
    created_at: datetime
    questions: List[Question] = []

    class Config:
        from_attributes = True

# Attempt schemas
class AttemptBase(BaseModel):
    quiz_id: int
    score: int
    total: int
    answers: dict

class AttemptCreate(AttemptBase):
    pass

class Attempt(AttemptBase):
    id: int
    user_id: int
    timestamp: datetime

    class Config:
        from_attributes = True

class AttemptDetail(Attempt):
    quiz: Quiz

class UserStats(BaseModel):
    total_quizzes: int
    total_attempts: int
    average_score: float
    quizzes_by_difficulty: dict
