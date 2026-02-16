import os
import argparse
import json
from dotenv import load_dotenv
import PyPDF2
import google.generativeai as genai

# Load environment variables from .env file
load_dotenv()

# Configure the Gemini API key
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("GOOGLE_API_KEY not found. Please set it in your .env file or environment.")
genai.configure(api_key=api_key)


def extract_text_from_pdf(pdf_filepath: str) -> str:
    """
    Extracts text from a PDF file.

    Args:
        pdf_filepath: The path to the PDF file.

    Returns:
        The extracted text as a single string.
    """
    text = ""
    try:
        with open(pdf_filepath, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                text += page.extract_text() + "\n"
    except Exception as e:
        print(f"Error extracting text from PDF '{pdf_filepath}': {e}")
        return None
    return text


def generate_mcqs_with_ai(chapter_text: str, difficulty: str, model_name: str) -> list:
    """
    Generates Multiple Choice Questions (MCQs) from the given chapter text
    using the Gemini AI model, with specified difficulty.
    """
    if not chapter_text.strip():
        print("Error: Chapter text is empty. Cannot generate MCQs.")
        return []

    print(f"Sending chapter text to Gemini AI for '{difficulty}' difficulty MCQ generation...")
    
    # Few-shot example to guide the AI's output format and style.
    # This helps improve accuracy and consistency.
    few_shot_example = """
Here is an example of the kind of output I want.
Context: "The mitochondrion is a double-membraned organelle found in most eukaryotic organisms. Mitochondria generate most of the cell's supply of adenosine triphosphate (ATP), used as a source of chemical energy."
Desired output:
[
  {
    "question": "What is the primary function of the mitochondrion?",
    "options": [
      "To store genetic information",
      "To generate chemical energy (ATP)",
      "To synthesize proteins",
      "To control cell division"
    ],
    "answer": "To generate chemical energy (ATP)"
  }
]
"""

    try:
        model = genai.GenerativeModel(model_name)
        prompt = (
            f"You are an expert quiz creator. Your task is to generate 5 multiple-choice questions (MCQs) from the following text.\n"
            f"The difficulty of the questions should be '{difficulty}'.\n"
            f"Follow the example provided to format your response.\n\n"
            f"--- EXAMPLE ---\n{few_shot_example}\n\n"
            f"--- CHAPTER TEXT ---\n{chapter_text[:8000]}\n---\n\n"
            f"Your response MUST be a valid JSON array of objects, where each object "
            f"has 'question', 'options' (an array of 4 strings), and 'answer' (the correct option string). "
            f"Do not include any explanatory text outside of the JSON array."
        )
        response = model.generate_content(prompt)
        
        # Clean the response to extract only the JSON part
        text_response = response.text.strip()
        json_start = text_response.find('[')
        json_end = text_response.rfind(']') + 1
        
        if json_start == -1 or json_end == 0:
            print("Error: Could not find a valid JSON array in the AI response.")
            print(f"Full response received:\n{response.text}")
            return []
            
        json_string = text_response[json_start:json_end]
        
        mcqs = json.loads(json_string)
        print("Successfully generated MCQs from AI.")
        return mcqs

    except json.JSONDecodeError as e:
        print(f"Error: Failed to decode JSON from AI response: {e}")
        print(f"Raw response was:\n{response.text}")
        return []
    except Exception as e:
        print(f"An unexpected error occurred while calling the AI model: {e}")
        return []


def save_mcqs_to_file(mcqs: list, output_filepath: str):
    """
    Saves the generated MCQs to a text file.
    """
    with open(output_filepath, 'w', encoding='utf-8') as f:
        for i, mcq in enumerate(mcqs):
            f.write(f"Question {i+1}: {mcq.get('question', 'N/A')}\n")
            options = mcq.get('options', [])
            for j, option in enumerate(options):
                f.write(f"  {chr(65+j)}. {option}\n")
            f.write(f"Answer: {mcq.get('answer', 'N/A')}\n\n")
    print(f"Generated MCQs saved to {output_filepath}")


def main():
    parser = argparse.ArgumentParser(description="Generate MCQs from a chapter using AI.")
    parser.add_argument("chapter_filepath", type=str,
                        help="Path to the text or PDF file for the chapter.")
    parser.add_argument("--output", "-o", type=str, default="generated_mcqs.txt",
                        help="Output file for the MCQs.")
    parser.add_argument("--difficulty", "-d", type=str, default="medium",
                        choices=["easy", "medium", "hard"],
                        help="Set the difficulty level for the questions.")
    parser.add_argument("--model", "-m", type=str, default="gemini-2.5-flash",
                        help="Specify the Gemini model to use (e.g., 'gemini-1.0-pro', 'gemini-1.5-flash').")
    args = parser.parse_args()

    if not os.path.exists(args.chapter_filepath):
        print(f"Error: Chapter file not found at '{args.chapter_filepath}'")
        return

    chapter_text = ""
    file_extension = os.path.splitext(args.chapter_filepath)[1].lower()

    if file_extension == ".pdf":
        print(f"Extracting text from PDF: {args.chapter_filepath}")
        chapter_text = extract_text_from_pdf(args.chapter_filepath)
        if chapter_text is None: # Explicitly check for extraction failure
            print(f"Failed to extract text from PDF: {args.chapter_filepath}. Aborting.")
            return
    elif file_extension == ".txt":
        print(f"Reading text from: {args.chapter_filepath}")
        with open(args.chapter_filepath, 'r', encoding='utf-8') as f:
            chapter_text = f.read()
    else:
        print(f"Error: Unsupported file type '{file_extension}'. Please use a .txt or .pdf file.")
        return

    if not chapter_text.strip(): # Check for empty or whitespace-only text
        print("Chapter text is empty or contains only whitespace. Aborting.")
        return

    mcqs = generate_mcqs_with_ai(chapter_text, args.difficulty, args.model)

    if mcqs:
        save_mcqs_to_file(mcqs, args.output)
    else:
        print("No MCQs were generated or an error occurred.")


if __name__ == "__main__":
    main()
