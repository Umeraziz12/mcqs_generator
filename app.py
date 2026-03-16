from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import json
import os
from mcq_generator import mcq_agent, extract_text_from_pdf, Runner

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allows the React app to communicate with the API
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
instruction_template = mcq_agent.instructions
@app.post("/generate-mcqs/")
def generate_mcqs(file: UploadFile = File(...), difficulty: str = Form("medium"), num_questions: int = Form(5)):
    """
    This endpoint receives a PDF file, difficulty, and number of questions, 
    extracts its text, and uses the MCQ agent to generate multiple-choice questions.
    """
    # Save the uploaded file temporarily
    temp_filepath = f"temp_{file.filename}"
    with open(temp_filepath, "wb") as buffer:
        buffer.write(file.file.read())

    # Extract text from the PDF
    content = extract_text_from_pdf(temp_filepath)
    os.remove(temp_filepath)

    if not content.strip():
        return {"error": "Could not extract text from the PDF."}

    # Use the agent to generate MCQs
    mcq_agent.instructions = instruction_template.format(num_questions=num_questions)
    prompt = f"Difficulty: {difficulty} Text: {content[:8000]}"
    result = Runner.run_sync(mcq_agent, prompt)
    
    if result and result.final_output:
        try:
            # Clean and parse the JSON output
            clean_text = result.final_output.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:-3].strip()
            
            mcqs = json.loads(clean_text)
            return mcqs
        except json.JSONDecodeError:
            return {"error": "Failed to parse the generated MCQs."}
    
    return {"error": "Failed to generate MCQs."}

@app.get("/")
def read_root():
    return {"message": "MCQ Generator API is running."}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
