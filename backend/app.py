from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from typing import List
from sqlalchemy.orm import Session
import uvicorn
import json
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from mcq_generator import mcq_agent, extract_text_from_pdf, Runner
from rag_engine import RAGEngine

import models, schemas, auth
from database import engine, get_db

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Load environment variables
load_dotenv(override=True)

app = FastAPI()

# Initialize RAG Engine globally to avoid reloading models on every request
rag_engine = RAGEngine()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allows the React app to communicate with the API
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

instruction_template = mcq_agent.instructions

# --- AUTH ENDPOINTS ---

@app.post("/auth/signup", response_model=schemas.User)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already taken")

    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/auth/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.get("/users/me/stats", response_model=schemas.UserStats)
def get_user_stats(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    quizzes = db.query(models.Quiz).filter(models.Quiz.user_id == current_user.id).all()
    attempts = db.query(models.Attempt).filter(models.Attempt.user_id == current_user.id).all()
    
    total_quizzes = len(quizzes)
    total_attempts = len(attempts)
    
    avg_score = 0
    if total_attempts > 0:
        avg_score = sum((a.score / a.total) * 100 for a in attempts) / total_attempts
        
    difficulty_stats = {"easy": 0, "medium": 0, "hard": 0}
    for q in quizzes:
        if q.difficulty in difficulty_stats:
            difficulty_stats[q.difficulty] += 1
            
    return {
        "total_quizzes": total_quizzes,
        "total_attempts": total_attempts,
        "average_score": avg_score,
        "quizzes_by_difficulty": difficulty_stats
    }

# --- QUIZ ENDPOINTS ---

@app.post("/generate-mcqs/", response_model=schemas.Quiz)
async def generate_mcqs(
    file: UploadFile = File(...), 
    difficulty: str = Form("medium"), 
    num_questions: int = Form(5),
    topic: str = Form(None),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    This endpoint receives a PDF file, difficulty, and number of questions, 
    extracts its text, indexes it using RAG, and generates MCQs based on the context.
    """
    print(f"Received request for file: {file.filename}, difficulty: {difficulty}, num_questions: {num_questions}")
    temp_filepath = f"temp_{file.filename}"
    try:
        # Save the uploaded file temporarily
        with open(temp_filepath, "wb") as buffer:
            buffer.write(await file.read())

        # Extract text from the PDF
        print(f"Extracting text from {temp_filepath}...")
        content = extract_text_from_pdf(temp_filepath)
        os.remove(temp_filepath)

        if not content.strip():
            print("Could not extract text from the PDF.")
            return {"error": "Could not extract text from the PDF."}

        # Process text using RAG Engine
        print("Processing text using RAG Engine...")
        rag_engine.process_text(content)
        
        # Retrieve relevant context
        if topic and topic.strip():
            print(f"Retrieving context for topic: {topic}")
            context = rag_engine.retrieve_context(topic)
        else:
            print("Retrieving diverse context...")
            context = rag_engine.get_diverse_context()

        # Use the agent to generate MCQs
        print(f"Generating {num_questions} MCQs via Agent...")
        mcq_agent.instructions = instruction_template.format(num_questions=num_questions)
        prompt = f"Difficulty: {difficulty}\n\nCONTEXT:\n{context}"
        
        # Use Runner.run for async
        result = await Runner.run(mcq_agent, prompt)
        
        if result and result.final_output:
            try:
                # Clean and parse the JSON output
                clean_text = result.final_output.strip()
                if clean_text.startswith("```json"):
                    clean_text = clean_text[7:]
                if clean_text.strip().endswith("```"):
                    clean_text = clean_text.strip()[:-3]
                
                print(f"Successfully generated MCQs: {clean_text[:100]}...")
                mcqs_json = json.loads(clean_text)
                
                # Save Quiz to Database
                new_quiz = models.Quiz(
                    user_id=current_user.id,
                    title=f"Quiz on {file.filename}",
                    difficulty=difficulty,
                    topic=topic or "General",
                    num_questions=num_questions
                )
                db.add(new_quiz)
                db.commit()
                db.refresh(new_quiz)
                
                # Save Questions to Database
                for q_data in mcqs_json:
                    new_q = models.Question(
                        quiz_id=new_quiz.id,
                        text=q_data.get("question"),
                        options=q_data.get("options"),
                        answer=q_data.get("answer"),
                        explanation=q_data.get("explanation")
                    )
                    db.add(new_q)
                db.commit()
                
                # Fetch complete quiz with questions
                db.refresh(new_quiz)
                # Access questions to ensure they are loaded
                _ = new_quiz.questions
                return new_quiz
                
            except json.JSONDecodeError as e:
                print(f"Failed to parse the generated MCQs: {e}")
                print(f"Raw output: {result.final_output}")
                raise HTTPException(status_code=500, detail=f"Failed to parse the generated MCQs: {str(e)}")
        
        print("Failed to generate MCQs from Agent.")
        raise HTTPException(status_code=500, detail="Failed to generate MCQs from Agent.")
    except Exception as e:
        import traceback
        print(f"Internal Error: {str(e)}")
        print(traceback.format_exc())
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/quizzes/", response_model=List[schemas.Quiz])
def get_user_quizzes(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Quiz).filter(models.Quiz.user_id == current_user.id).order_by(models.Quiz.created_at.desc()).all()

@app.get("/quizzes/{quiz_id}", response_model=schemas.Quiz)
def get_quiz(quiz_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    quiz = db.query(models.Quiz).filter(models.Quiz.id == quiz_id, models.Quiz.user_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz

@app.post("/attempts/", response_model=schemas.Attempt)
def save_attempt(attempt: schemas.AttemptCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    new_attempt = models.Attempt(
        user_id=current_user.id,
        quiz_id=attempt.quiz_id,
        score=attempt.score,
        total=attempt.total,
        answers=attempt.answers
    )
    db.add(new_attempt)
    db.commit()
    db.refresh(new_attempt)
    return new_attempt

@app.get("/attempts/", response_model=List[schemas.Attempt])
def get_user_attempts(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Attempt).filter(models.Attempt.user_id == current_user.id).order_by(models.Attempt.timestamp.desc()).all()

@app.get("/attempts/{attempt_id}", response_model=schemas.AttemptDetail)
def get_attempt(attempt_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    attempt = db.query(models.Attempt).filter(models.Attempt.id == attempt_id, models.Attempt.user_id == current_user.id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    return attempt

@app.get("/")
def read_root():
    return {"message": "MCQ Generator API is running."}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
