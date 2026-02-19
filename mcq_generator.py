import os
import argparse
import json
import PyPDF2
from dotenv import load_dotenv
from agents import (
    Agent, 
    Runner, 
    AsyncOpenAI, 
    OpenAIChatCompletionsModel, 
    set_default_openai_api,
    set_tracing_disabled
)

# Load environment variables (expects OPENROUTER_API_KEY in .env)
load_dotenv()

# --- STEP 1: UTILITIES ---
def extract_text_from_pdf(pdf_filepath: str) -> str:
    text = ""
    try:
        with open(pdf_filepath, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                text += page.extract_text() + "\n"
    except Exception as e:
        print(f"Error extracting PDF: {e}")
        return ""
    return text

def save_mcqs_to_file(mcqs_text: str, output_filepath: str):
    """Parses AI output and appends formatted MCQs to a file."""
    try:
        # Clean potential markdown formatting
        clean_text = mcqs_text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        if clean_text.strip().endswith("```"):
            clean_text = clean_text.strip()[:-3]
        
        mcqs = json.loads(clean_text)
        
        file_exists = os.path.exists(output_filepath)
        
        with open(output_filepath, 'a', encoding='utf-8') as f:
            if file_exists:
                f.write("\n" + "="*40 + "\n")
                f.write("NEW GENERATION\n")
                f.write("="*40 + "\n\n")
                
            for i, mcq in enumerate(mcqs):
                f.write(f"Question {i+1}: {mcq.get('question', 'N/A')}\n")
                options = mcq.get('options', [])
                for j, option in enumerate(options):
                    f.write(f"  {chr(65+j)}. {option}\n")
                f.write(f"Answer: {mcq.get('answer', 'N/A')}\n\n")
        print(f"Successfully appended MCQs to {output_filepath}")
    except Exception as e:
        print(f"Error saving file: {e}. Appending raw output instead.")
        with open(output_filepath, 'a', encoding='utf-8') as f:
            f.write("\n--- RAW OUTPUT ---\n")
            f.write(mcqs_text)
            f.write("\n------------------\n")

# Disable tracing to avoid errors with non-OpenAI keys
set_tracing_disabled(True)

# Set default API to chat_completions for OpenRouter compatibility
set_default_openai_api("chat_completions")

# 1. Get your OpenRouter Key
openrouter_key = os.environ.get("OPENROUTER_API_KEY")

# 2. Create a custom OpenAI client for OpenRouter
openrouter_client = AsyncOpenAI(
    api_key=openrouter_key,
    base_url="https://openrouter.ai/api/v1"
)

# 3. Initialize the model using the client
openrouter_model = OpenAIChatCompletionsModel(
    model="openai/gpt-4o-mini",
    openai_client=openrouter_client
)

# Define the agent
mcq_agent = Agent(
    name="MCQ Generator",
    instructions="""You are an expert quiz creator. 
    Your task is to generate 5 MCQs from the provided text.
    Return ONLY a valid JSON array of objects.
    Each object must have: 'question', 'options' (list of 4 strings), and 'answer' (string).
    Do not include any explanation or markdown outside the JSON.""",
    model=openrouter_model
)

# --- STEP 4: MAIN LOGIC ---
def main():
    parser = argparse.ArgumentParser(description="Generate MCQs from a chapter using Agents SDK.")
    parser.add_argument("chapter_filepath", type=str, help="Path to the text or PDF file.")
    parser.add_argument("--output", "-o", type=str, default="generated_mcqs.txt", help="Output file.")
    parser.add_argument("--difficulty", "-d", type=str, default="medium", 
                        choices=["easy", "medium", "hard"], help="Difficulty level.")
    args = parser.parse_args()

    if not os.path.exists(args.chapter_filepath):
        print(f"Error: File not found: {args.chapter_filepath}")
        return

    content = ""
    ext = os.path.splitext(args.chapter_filepath)[1].lower()
    
    if ext == ".pdf":
        print(f"Extracting text from PDF...")
        content = extract_text_from_pdf(args.chapter_filepath)
    elif ext == ".txt":
        with open(args.chapter_filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    else:
        print(f"Unsupported file type: {ext}")
        return
    
    if not content.strip():
        print("No content found in file.")
        return

    # Pass text and difficulty to the agent
    prompt = f"Difficulty: {args.difficulty}\n\nText: {content[:8000]}"
    
    print(f"Generating {args.difficulty} difficulty MCQs via Agent...")
    result = Runner.run_sync(mcq_agent, prompt)
    
    if result and result.final_output:
        save_mcqs_to_file(result.final_output, args.output)
    else:
        print("Failed to generate MCQs.")

if __name__ == "__main__":
    main()