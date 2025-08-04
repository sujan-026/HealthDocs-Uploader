import os
import gradio as gr
import numpy as np
import webrtcvad
import collections
import audioop
import requests
import wave
import librosa
from tempfile import NamedTemporaryFile
import google.generativeai as genai
from dotenv import load_dotenv
import asyncio

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

try:
    with open("system_prompt.txt", "r", encoding="utf-8") as f:
        GEMINI_SYSTEM_PROMPT = f.read()
    with open("doctor_prompt.txt", "r", encoding="utf-8") as f:
        GEMINI_DOCTOR_PROMPT = f.read()
    with open("jarvis_prompt.txt", "r", encoding="utf-8") as f:
        GEMINI_JARVIS_PROMPT = f.read()
except FileNotFoundError as e:
    print(f"CRITICAL ERROR: Prompt file not found: {e.filename}. Please create it.")
    exit()

VAD_AGGRESSIVENESS = 1
TARGET_SAMPLE_RATE = 16000
CHUNK_DURATION_MS = 30
CHUNK_SIZE = int(TARGET_SAMPLE_RATE * CHUNK_DURATION_MS / 1000)
SILENCE_DURATION_S = 0.5
THRESHOLD = 400

GEMINI_MODEL_NAME = 'gemini-2.5-flash-lite-preview-06-17'
gemini_scribe_model = None
gemini_doctor_model = None
gemini_jarvis_model = None

if GOOGLE_API_KEY:
    try:
        genai.configure(api_key=GOOGLE_API_KEY)
        gemini_scribe_model = genai.GenerativeModel(GEMINI_MODEL_NAME)
        gemini_doctor_model = genai.GenerativeModel(GEMINI_MODEL_NAME)
        gemini_jarvis_model = gemini_doctor_model
        print(f"Successfully configured Gemini models: {GEMINI_MODEL_NAME}")
    except Exception as e:
        print(f"CRITICAL ERROR configuring Google AI: {e}")
else:
    print("CRITICAL ERROR: GOOGLE_API_KEY not found in .env file.")

def transcribe_audio_bytes(audio_bytes):
    print("Sending audio to Groq for transcription...")
    try:
        with NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_file.write(audio_bytes)
            temp_path = temp_file.name
        with open(temp_path, "rb") as file:
            files = {"file": (os.path.basename(temp_path), file.read())}
        data = {"model": "whisper-large-v3"}
        response = requests.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            files=files,
            data=data
        )
        response.raise_for_status()
        return response.json().get("text", "")
    except Exception as e:
        return f"[Transcription Error: {e}]"
    finally:
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)

async def get_gemini_summary_async(full_transcript, previous_summary):
    if not full_transcript.strip() or gemini_scribe_model is None:
        return previous_summary
    prompt = (
        f"{GEMINI_SYSTEM_PROMPT}\n\n"
        f"**PREVIOUS SUMMARY:**\n```markdown\n{previous_summary}\n```\n\n"
        f"**FULL TRANSCRIPT:**\n\"\"\"\n{full_transcript}\n\"\"\""
    )
    try:
        response = await gemini_scribe_model.generate_content_async(prompt)
        return response.text
    except Exception as e:
        print(f"Scribe API error: {e}")
        return f"{previous_summary}\n\n**[Scribe Error]**"

async def get_doctor_preview_async(full_transcript):
    if not full_transcript.strip() or gemini_doctor_model is None:
        return "Awaiting conversation..."
    prompt = (
        f"{GEMINI_DOCTOR_PROMPT}\n\n"
        f"**FULL CONVERSATION TRANSCRIPT SO FAR:**\n\"\"\"\n{full_transcript}\n\"\"\""
    )
    try:
        response = await gemini_doctor_model.generate_content_async(prompt)
        return response.text
    except Exception as e:
        print(f"Doctor Assistant API error: {e}")
        return "**[Assistant Error]**"

async def extract_jarvis_command_async(text_segment):
    if gemini_jarvis_model is None or "jarvis" not in text_segment.lower():
        return None
    prompt = (
        f"{GEMINI_JARVIS_PROMPT}\n\n"
        f"**TEXT SEGMENT TO ANALYZE:**\n\"\"\"\n{text_segment}\n\"\"\""
    )
    try:
        response = await gemini_jarvis_model.generate_content_async(prompt)
        cmd = response.text.strip()
        return None if cmd == "[NO_COMMAND]" or not cmd else cmd
    except Exception as e:
        print(f"Jarvis extractor API error: {e}")
        return None

async def process_audio_stream(stream, state):
    if state is None:
        state = {
            "vad": webrtcvad.Vad(VAD_AGGRESSIVENESS),
            "is_speaking": False,
            "silent_chunks_count": 0,
            "audio_buffer": b'',
            "speech_buffer": collections.deque(),
            "full_transcription": "",
            "last_gemini_word_count": 0,
            "current_summary": "### Live Medical Note\n\n*Awaiting conversation...*",
            "doctor_preview": "### Doctor's Assistant\n\n*Awaiting conversation...*",
            "jarvis_commands": []
        }
    sample_rate, audio_chunk = stream
    if sample_rate is None or audio_chunk is None:
        return (
            state["full_transcription"],
            state["current_summary"],
            state["doctor_preview"],
            "\n".join(state["jarvis_commands"]),
            state
        )
    resampled = librosa.resample(
        y=audio_chunk.astype(np.float32) / 32768.0,
        orig_sr=sample_rate,
        target_sr=TARGET_SAMPLE_RATE
    )
    pcm = (resampled * 32767).astype(np.int16).tobytes()
    state["audio_buffer"] += pcm
    while len(state["audio_buffer"]) >= CHUNK_SIZE * 2:
        chunk = state["audio_buffer"][:CHUNK_SIZE * 2]
        state["audio_buffer"] = state["audio_buffer"][CHUNK_SIZE * 2:]
        try:
            is_speech = state["vad"].is_speech(chunk, TARGET_SAMPLE_RATE)
            volume = audioop.rms(chunk, 2)
        except Exception:
            is_speech, volume = False, 0
        if is_speech and volume > THRESHOLD:
            if not state["is_speaking"]:
                print("Speech detected...", end="", flush=True)
                state["is_speaking"] = True
            state["speech_buffer"].append(chunk)
            state["silent_chunks_count"] = 0
        elif state["is_speaking"]:
            state["speech_buffer"].append(chunk)
            state["silent_chunks_count"] += 1
            if state["silent_chunks_count"] > int(SILENCE_DURATION_S * 1000 / CHUNK_DURATION_MS):
                print(" Silence detected, processing.")
                recorded = b"".join(state["speech_buffer"])
                new_trans = transcribe_audio_bytes(recorded)
                if new_trans.strip() and "Error" not in new_trans:
                    state["full_transcription"] += " " + new_trans
                    scribe_task = get_gemini_summary_async(
                        state["full_transcription"], state["current_summary"]
                    )
                    doctor_task = get_doctor_preview_async(state["full_transcription"])
                    jarvis_task = extract_jarvis_command_async(new_trans)
                    results = await asyncio.gather(scribe_task, doctor_task, jarvis_task)
                    state["current_summary"], state["doctor_preview"], cmd = results
                    if cmd:
                        state["jarvis_commands"].append(f"▶ {cmd}")
                state["is_speaking"] = False
                state["speech_buffer"].clear()
                print("\nListening...")
    return (
        state["full_transcription"].strip(),
        state["current_summary"],
        state["doctor_preview"],
        "\n".join(state["jarvis_commands"]),
        state
    )

def clear_all():
    return (
        "",
        "### Live Medical Note\n\n*Awaiting conversation...*",
        "### Doctor's Assistant\n\n*Awaiting conversation...*",
        "",
        None
    )

custom_css = """
#summary-output-container .gradio-container { min-height: 500px; }
#doctor-preview-container .gradio-container { min-height: 250px; }
#jarvis-output .gradio-container { min-height: 250px; }
"""

with gr.Blocks(theme=gr.themes.Soft(), title="AI Medical Scribe & Assistant", css=custom_css) as demo:
    gr.Markdown("# AI Medical Scribe & Assistant")
    gr.Markdown(
        "Click 'Start Recording' and begin the conversation. "
        "To issue a command, say **'Jarvis'** followed by your request."
    )
    state = gr.State(None)
    with gr.Row():
        audio_input = gr.Audio(sources="microphone", streaming=True, label="Live Audio Stream")
    with gr.Row():
        transcription_output = gr.Textbox(
            label="Live Transcription (Whisper)",
            interactive=False,
            lines=25,
            placeholder="Raw transcription will appear here..."
        )
        summary_output = gr.Markdown(
            label="Live Structured Note (Scribe)",
            value="### Live Medical Note\n\n*Awaiting conversation...*",
            elem_id="summary-output-container"
        )
    with gr.Row():
        doctor_preview_output = gr.Markdown(
            label="Doctor's Assistant Preview",
            value="### Doctor's Assistant\n\n*Awaiting conversation...*",
            elem_id="doctor-preview-container"
        )
        jarvis_output = gr.Textbox(
            label="Jarvis Commands Log",
            interactive=False,
            lines=10,
            placeholder="Commands issued to Jarvis will appear here...",
            elem_id="jarvis-output"
        )
    clear_button = gr.Button("Clear All and Reset")
    audio_input.stream(
        fn=process_audio_stream,
        inputs=[audio_input, state],
        outputs=[transcription_output, summary_output, doctor_preview_output, jarvis_output, state],
        show_progress="hidden"
    )
    clear_button.click(
        fn=clear_all,
        inputs=[],
        outputs=[transcription_output, summary_output, doctor_preview_output, jarvis_output, state]
    )

if __name__ == "__main__":
    if not all([GROQ_API_KEY, GOOGLE_API_KEY]):
        print("\n" + "="*50)
        print("ERROR: ONE OR MORE API KEYS NOT FOUND in .env file!")
        print("Please ensure GROQ_API_KEY and GOOGLE_API_KEY are set.")
        print("="*50 + "\n")
    else:
        demo.launch(share=True, debug=True)
