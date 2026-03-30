# MCQ Generator

An AI-powered tool that generates Multiple Choice Questions (MCQs) from PDF or text documents using OpenRouter and the OpenAI Agents SDK.

## Features

- **PDF & TXT Support**: Extracts content from both PDF and plain text files.
- **Adjustable Difficulty**: Generate questions with "easy", "medium", or "hard" difficulty levels.
- **Formatted Output**: Automatically formats and saves generated MCQs (Questions, Options, and Answers) to a text file.
- **OpenRouter Integration**: Uses OpenRouter to access high-quality models like GPT-4o-mini.

## Prerequisites

- Python 3.7+
- An [OpenRouter](https://openrouter.ai/) API Key.

## Setup

1.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

2.  **Configure Environment Variables**:
    Create a `.env` file in the project root (or edit the existing one) and add your OpenRouter API key:
    ```env
    OPENROUTER_API_KEY=your_openrouter_api_key_here
    ```

## Usage

Run the script from your terminal by providing the path to a chapter file (PDF or TXT).

### Basic Command
```bash
python mcq_generator.py path/to/your/chapter.pdf
```

### Advanced Usage
You can specify the difficulty level and the output filename:
```bash
python mcq_generator.py "E:\chemistry 9\chapter 1.pdf" -d hard -o results.txt
```

### Arguments
- `chapter_filepath`: (Required) Path to the input PDF or TXT file.
- `-d`, `--difficulty`: (Optional) Difficulty of the questions. Choices: `easy`, `medium`, `hard` (default: `medium`).
- `-o`, `--output`: (Optional) The file where MCQs will be saved (default: `generated_mcqs.txt`).

## How it Works

1. The script extracts text from the provided file.
2. It sends the content to an AI agent configured with the OpenAI Agents SDK.
3. The agent generates 5 MCQs in JSON format.
4. The script parses the JSON and appends the formatted questions to your specified output file.