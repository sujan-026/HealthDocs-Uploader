import gradio as gr
import pandas as pd
import asyncio
import gspread
from google.oauth2.service_account import Credentials
from gradio.themes.base import Base # Import the Base theme

# ------------------------------------------------------------------------------
# 1. Google Sheets Authentication
# ------------------------------------------------------------------------------
try:
    # Ensure you have your service account JSON file in the same directory
    # or provide the correct path.
      gc = gspread.authorize(creds)
    sh = gc.open("PatientData")
    ws = sh.sheet1
    print("✅ Google Sheets authenticated successfully.")
except Exception as e:
    print(f"⚠️ Could not authenticate with Google Sheets: {e}. Using offline fallback data.")
    # Create a dummy dataframe for offline testing if auth fails
    ws = pd.DataFrame({
        "abha_id": ["12345678901233", "98765432109876"],
        "full_name": ["Pashwiwi Sharma", "John Doe"],
        "Age": [22, 45],
        "weight_kg": ["64", "85"],
        "reason_for_visit": ["Allergy on right hand, experiencing for 1 day, severity rated as 8", "Annual Check-up"],
        "allergies": ["Severe pain in right hand, feeling very tired", "Pollen"],
        "Medication": ["None", "Lisinopril"],
        "symptoms_description": ["Unsure of the cause of current allergy on right hand", "None"],
        "Summary": ["This is a summary of the patient's visit. The allergy on the right hand is acute and requires immediate attention.", "Patient is in good health. Continue current medication."]
    })


# ------------------------------------------------------------------------------
# 2. Async Patient Fetch Logic
# ------------------------------------------------------------------------------
async def fetch_patient_data(abha_id):
    """Fetches and formats patient info and summary."""
    print(f"Looking for ABHA ID: {abha_id}")

    # Initial states for outputs
    placeholder_demographics = "*Patient details will appear here after fetching.*"
    placeholder_summary = "*Patient summary will appear here after fetching.*"

    if not abha_id:
        gr.Warning("Please enter an ABHA ID before fetching.")
        return placeholder_demographics, placeholder_summary

    try:
        await asyncio.sleep(0.5)  # Simulate network latency

        # Handle both gspread worksheet and pandas DataFrame for fallback
        if isinstance(ws, gspread.worksheet.Worksheet):
            records = ws.get_all_records()
            df = pd.DataFrame(records)
        else:
            df = ws

        # Normalize data to string and strip whitespace for reliable matching
        df["abha_id"] = df["abha_id"].astype(str).str.strip()
        abha_id_stripped = abha_id.strip()

        # Search for matching ABHA ID
        row = df[df["abha_id"] == abha_id_stripped]

        if row.empty:
            gr.Error(f"No record found for ABHA ID: {abha_id}")
            return placeholder_demographics, placeholder_summary

        record = row.iloc[0]

        # Format patient demographics into a clean markdown string
        patient_info_md = f"""
        **ABHA ID:** {record.get('abha_id', 'N/A')}  
        **Name:** {record.get('full_name', 'N/A')}  
        **Age:** {record.get('Age', 'N/A')}  
        **Weight:** {record.get('weight_kg', 'N/A')} kg  
        **Reason for Visit:** {record.get('reason_for_visit', 'N/A')}  
        **Allergies:** {record.get('allergies', 'N/A')}  
        **Medication:** {record.get('Medication', 'N/A')}  
        **Symptoms:** {record.get('symptoms_description', 'N/A')}
        """

        # Format the summary markdown string
        summary_text = str(record.get('Summary', 'No summary available.')).replace('\\n', '\n\n')
        summary_md = f"{summary_text}"

        return patient_info_md, summary_md

    except Exception as e:
        print(f"❌ Error during fetch: {e}")
        gr.Error(f"An unexpected error occurred: {str(e)}")
        return placeholder_demographics, placeholder_summary

# ------------------------------------------------------------------------------
# 3. Image Handling Logic
# ------------------------------------------------------------------------------
def handle_image_upload(files):
    """
    Validates the number of uploaded files and returns their paths for the gallery.
    """
    if not files:
        return None # Return None to clear the gallery

    if len(files) > 5:
        gr.Warning("You can upload a maximum of 5 images. Only the first 5 will be displayed.")
        files = files[:5] # Limit to the first 5 files

    # The 'files' object is a list of temp files. We need their paths (.name).
    filepaths = [file.name for file in files]
    return filepaths


# ------------------------------------------------------------------------------
# 4. Gradio UI Layout
# ------------------------------------------------------------------------------
with gr.Blocks(theme=Base(), title="Patient Data Viewer") as app:
    gr.Markdown("# Patient Data Viewer (ABHA)")
    gr.Markdown("Enter a patient's ABHA ID to retrieve their records and upload relevant documents.")

    # --- Input Section ---
    with gr.Row():
        abha_id_input = gr.Textbox(
            label="Enter Patient ABHA ID",
            placeholder="e.g., 12345678901233",
            scale=3,
            container=False # Removes the border around the textbox
        )
        fetch_button = gr.Button("Fetch Patient Details", variant="primary", scale=1)

    gr.Markdown("---")

    # --- Data Display Section (Side-by-Side) ---
    with gr.Row(variant="panel"):
        # Left Side: Patient Demographics
        with gr.Column(scale=1):
            with gr.Accordion("Patient Demographics", open=True):
                patient_info_output = gr.Markdown("*Patient details will appear here.*")

        # Right Side: Patient Summary
        with gr.Column(scale=1):
            with gr.Accordion("Patient Summary", open=True):
                summary_output = gr.Markdown("*Patient summary will appear here.*")

    gr.Markdown("---")

    # --- Image Upload Section ---
    with gr.Blocks() as upload_section:
        gr.Markdown("### Upload Patient Scans & Documents")
        with gr.Column(variant="panel"):
            image_uploader = gr.File(
                label="Upload up to 5 images (PNG, JPG, etc.)",
                file_count="multiple",
                file_types=["image"],
            )
            image_gallery = gr.Gallery(
                label="Uploaded Documents",
                show_label=True,
                elem_id="gallery",
                columns=[5],
                object_fit="contain",
                height="auto"
            )

    # --------------------------------------------------------------------------
    # 5. Event Listeners
    # --------------------------------------------------------------------------
    fetch_button.click(
        fn=fetch_patient_data,
        inputs=[abha_id_input],
        outputs=[patient_info_output, summary_output]
    )

    image_uploader.upload(
        fn=handle_image_upload,
        inputs=[image_uploader],
        outputs=[image_gallery]
    )

# ------------------------------------------------------------------------------
# 6. Launch App
# ------------------------------------------------------------------------------
if __name__ == "__main__":
    app.launch(share=True, debug=True)