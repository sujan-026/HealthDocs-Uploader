import gradio as gr
import pandas as pd
import asyncio
import gspread
from google.oauth2.service_account import Credentials
from gradio.themes.base import Base
import os
import google.generativeai as genai
from PIL import Image
import traceback
import time
import re
from dotenv import load_dotenv

# --- Configuration & Setup ---

# Load environment variables from .env file
load_dotenv()

# --- PDF Generation Imports ---
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as RLImage, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import navy, black, dimgrey
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY

# ==============================================================================
# 1. AUTHENTICATION & CONFIGURATION
# ==============================================================================

MAX_IMAGES = 5

# **NEW**: The single source of truth for your Google Sheet column order.
EXPECTED_HEADERS = [
    "abha_id", "full_name", "Age", "weight_kg", "reason_for_visit", 
    "allergies", "Medication", "symptoms_description", "Summary", 
    "image1_summary", "image2_summary", "image3_summary", "image4_summary", 
    "image5_summary", "executive_summary"
]

# --- Google Sheets ---
GOOGLE_SHEETS_CREDS_PATH = os.getenv("GOOGLE_SHEETS_CREDS_PATH", "dbott-464906-c46c8756b829.json")
is_sheets_authenticated = False
try:
    SCOPES = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]
    creds = Credentials.from_service_account_file(GOOGLE_SHEETS_CREDS_PATH, scopes=SCOPES)
    gc = gspread.authorize(creds)
    sh = gc.open("PatientData")
    ws = sh.get_worksheet(0)
    print("✅ Google Sheets authenticated successfully.")
    is_sheets_authenticated = True
except Exception as e:
    print(f"⚠️ Could not authenticate with Google Sheets: {e}. Using offline fallback data.")
    # Fallback data now includes the new columns for consistency
    fallback_data = {h: [] for h in EXPECTED_HEADERS}
    fallback_data.update({
        "abha_id": ["12345678901233"], "full_name": ["Pashwiwi Sharma"], "Age": [22], "weight_kg": ["64"],
        "reason_for_visit": ["Allergy on right hand, with severe pain and fatigue"], "allergies": ["Pollen"],
        "Medication": ["None"], "symptoms_description": ["Unsure of cause, itchy rash"],
        "Summary": ["Patient presents with an acute allergic reaction..."]
    })
    ws = pd.DataFrame(fallback_data)


# --- Gemini API ---
is_gemini_configured = False
try:
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    if not GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY environment variable not set.")
    genai.configure(api_key=GOOGLE_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-1.5-flash-latest')
    print("✅ Gemini API configured successfully.")
    is_gemini_configured = True
except Exception as e:
    print(f"⚠️ Could not configure Gemini API: {e}. AI features will be disabled.")
    gemini_model = None

# ==============================================================================
# 2. SYSTEM PROMPTS (No changes needed here)
# ==============================================================================
SYSTEM_PROMPT_IMAGE_ANALYSIS = """
You are a board-certified medical imaging expert with 40+ years of experience in diagnostic imaging, prescriptions, lab reports, and clinical documentation. Your task is to:

Automatically classify the uploaded file.
Extract patient demographics (if available).
Deliver a structured, type-specific analysis.
Include a disclaimer only at the end of the response.

Step 1: Document Classification & Patient Details
A. Patient Information (If Available)
Name: [e.g., "Jane Doe"]
Age/Sex: [e.g., "38-year-old female"]
Date: [Document date, e.g., "15-Mar-2024"]
Doctor's name and qualification: [John,MBBS,PhD]

B. Document Type Identification
Classify the file into one of these categories:

Medical Image (X-ray, CT, MRI, Ultrasound)
Prescription (Handwritten/Digital)
Lab Report (Blood tests, pathology)
Medical Report (Discharge summary, clinic note)
Other (ECG, biopsy report, etc.)

step 2:
0. **Report Information** (if applicable): Doctor/Clinic Name, Date, Hospital/Facility, Patient Details (Age, Sex, etc.) if visible.
1. **Image Type & Region**: Modality (X-ray, MRI, CT, Ultrasound, Photo, etc.), anatomical region, and positioning.
2. **Key Findings**: Systematically list primary observations and potential abnormalities with detailed descriptions.
3. **Diagnostic Assessment**: Provide a primary assessment or impression. List differential diagnoses if applicable. Highlight any critical/urgent findings.
4. **Patient-Friendly Explanation**: Simplify the findings in clear, non-technical language.
---
***Disclaimer:** This AI-generated analysis is for informational purposes only and is NOT a substitute for professional medical advice, diagnosis, or treatment. A qualified healthcare professional must perform the final interpretation.*
"""

SYSTEM_PROMPT_DETAILED_REPORT = """You are an expert medical scribe AI. Your task is to create a single, comprehensive, and data-rich patient report by synthesizing all the provided information.
**Your Goal:** Weave the patient's demographics, their past medical summary, the reason for their current visit, and the findings from new medical images into a cohesive and professional narrative.
**Required Structure:** Generate the report in Markdown format using the exact following headings:
### Patient Information
(Summarize the patient's key demographic details: ABHA ID, Name, Age, Weight.)
### Medical History & Previous Summary
(Detail the patient's known allergies, current medications, and the summary from their previous visits. This provides historical context.)
### Current Visit Details
(Describe the primary reason for the current visit and the specific symptoms the patient is experiencing now.)
### Comprehensive Image Analysis
(Integrate the findings from all the provided image analyses. For each image, present its key findings and diagnostic assessment in a clear, organized manner. If there are multiple images, address each one.)
### Overall Synthesis & Impression
(This is the most important section. Provide a concise, professional synthesis that connects the dots. Correlate the patient's history and current symptoms with the new findings from the image analysis. Formulate a concluding impression based on the totality of the information.)
"""

# ==============================================================================
# 3. PDF GENERATION ENGINE
# ==============================================================================
def create_report_pdf(markdown_text, image_paths, image_analyses):
    # This function remains the same.
    try:
        pdf_path = f"temp_report_{int(time.time())}.pdf"
        doc = SimpleDocTemplate(pdf_path, pagesize=(8.5 * inch, 11 * inch), topMargin=0.75*inch, bottomMargin=0.75*inch, leftMargin=0.75*inch, rightMargin=0.75*inch)
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(name='TitleStyle', fontName='Helvetica-Bold', fontSize=18, alignment=TA_CENTER, textColor=navy, spaceAfter=24))
        styles.add(ParagraphStyle(name='HeadingStyle', fontName='Helvetica-Bold', fontSize=14, textColor=navy, spaceBefore=12, spaceAfter=6))
        styles.add(ParagraphStyle(name='Justify', parent=styles['Normal'], alignment=TA_JUSTIFY))
        styles.add(ParagraphStyle(name='BulletStyle', parent=styles['Justify'], leftIndent=20, spaceAfter=4))
        styles.add(ParagraphStyle(name='ImageTitle', parent=styles['Normal'], alignment=TA_CENTER, spaceBefore=18, spaceAfter=4, fontName='Helvetica-Bold'))
        styles.add(ParagraphStyle(name='ImageCaption', parent=styles['Normal'], alignment=TA_CENTER, spaceAfter=12, fontName='Helvetica-Oblique', textColor=dimgrey, fontSize=9))

        story = [Paragraph("Comprehensive Medical Report", styles['TitleStyle'])]
        for line in markdown_text.split('\n'):
            line = line.strip()
            if not line: continue
            line = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', line)
            if line.startswith('### '): story.append(Paragraph(line.replace('### ', ''), styles['HeadingStyle']))
            elif line.startswith('* '): story.append(Paragraph(f"• {line.replace('* ', '', 1)}", styles['BulletStyle']))
            else: story.append(Paragraph(line, styles['Justify']))

        if image_paths and image_analyses:
            story.append(PageBreak())
            story.append(Paragraph("Appendix: Medical Images & Findings", styles['HeadingStyle']))
            for i, img_path in enumerate(image_paths):
                if i < len(image_analyses):
                    analysis_text = image_analyses[i]
                    caption_text = "No specific assessment found."
                    assessment_match = re.search(r"3\.\s*\*\*Diagnostic Assessment\*\*\n(.*?)(?=\n\n|\n4\.|\Z)", analysis_text, re.DOTALL | re.IGNORECASE)
                    if assessment_match: caption_text = assessment_match.group(1).strip()
                    else:
                        findings_match = re.search(r"2\.\s*\*\*Key Findings\*\*\n(.*?)(?=\n\n|\n3\.|\Z)", analysis_text, re.DOTALL | re.IGNORECASE)
                        if findings_match: caption_text = findings_match.group(1).strip()
                    story.append(Paragraph(f"Image {i+1}", styles['ImageTitle']))
                    story.append(Paragraph(f"<i>Summary: {caption_text}</i>", styles['ImageCaption']))
                    try:
                        img = RLImage(img_path, width=5.5*inch, height=5.5*inch, kind='proportional')
                        img.hAlign = 'CENTER'
                        story.append(img)
                    except Exception: story.append(Paragraph(f"<i>Error displaying image {i+1}.</i>", styles['Normal']))
        doc.build(story)
        return pdf_path
    except Exception as e:
        traceback.print_exc()
        return None

# ==============================================================================
# 4. CORE LOGIC
# ==============================================================================

# **UPGRADED**: Now uses header names, not letters, for robust updates.
async def update_google_sheet(abha_id, report_text, *image_analyses):
    if not is_sheets_authenticated:
        gr.Warning("Google Sheets not authenticated. Skipping database update.")
        return "Could not update Sheet: Authentication failed."
    try:
        print(f"Attempting to update Google Sheet for ABHA ID: {abha_id}")
        cell = ws.find(abha_id, in_column=1)
        if not cell:
            gr.Warning(f"ABHA ID {abha_id} not found. Skipping update.")
            return f"Could not update Sheet: ABHA ID {abha_id} not found."
        
        row_number = cell.row
        sheet_headers = ws.row_values(1) # Get the live headers from the sheet
        updates_to_make = []

        # Map the data to be written to the correct header name
        data_to_write = {"executive_summary": report_text}
        for i, analysis in enumerate(image_analyses):
            if i < MAX_IMAGES:
                data_to_write[f"image{i+1}_summary"] = analysis
        
        # Build the batch update request dynamically
        for header, value in data_to_write.items():
            if value and "Pending" not in value and "Failed" not in value:
                try:
                    col_index = sheet_headers.index(header) + 1
                    cell_a1 = gspread.utils.rowcol_to_a1(row_number, col_index)
                    updates_to_make.append({'range': cell_a1, 'values': [[value]]})
                except ValueError:
                    print(f"⚠️ Warning: Column '{header}' not found in Google Sheet. Skipping.")

        if updates_to_make:
            ws.batch_update(updates_to_make)
            print(f"✅ Successfully updated row {row_number} for ABHA ID: {abha_id}")
            return "✅ Database update complete."
        return "No new data to update in the database."
    except Exception as e:
        print(f"❌ FAILED to update Google Sheet: {e}")
        traceback.print_exc()
        gr.Error(f"Failed to update Google Sheet: {e}")
        return "❌ Database update failed. See console for details."

# **UPGRADED**: Displays data exactly as ordered in EXPECTED_HEADERS.
async def fetch_patient_data(abha_id):
    if not abha_id:
        return "*Patient details will appear here.*", "*Patient history will appear here.*"

    try:
        if is_sheets_authenticated:
            all_values = ws.get_all_values()
            if len(all_values) < 2: return "Spreadsheet has no data records.", ""
            headers = all_values[0]
            df = pd.DataFrame(all_values[1:], columns=headers)
        else:
            df = ws

        df["abha_id"] = df["abha_id"].astype(str).str.strip()
        row = df[df["abha_id"] == abha_id.strip()]
        
        if row.empty:
            return f"**Status:** No record found for ABHA ID: `{abha_id}`", ""
        
        record = row.iloc[0].to_dict()
        
        # Define which headers go into which UI box
        demographics_headers = ["abha_id", "full_name", "Age", "weight_kg", "reason_for_visit", "symptoms_description"]
        history_headers = ["allergies", "Medication", "Summary"]

        # Build markdown strings based on the defined order
        patient_info_md = "\n".join([f"**{h.replace('_', ' ').title()}:** {record.get(h, 'N/A')}" for h in demographics_headers])
        summary_text = "\n".join([f"**{h.replace('_', ' ').title()}:** {record.get(h, 'N/A')}" for h in history_headers])
        
        return patient_info_md, summary_text
    except Exception as e:
        traceback.print_exc()
        return f"**Error:** An error occurred while fetching data: {e}", ""

# analyze_images_on_upload remains the same.
async def analyze_images_on_upload(files):
    gallery_update = gr.update(value=None, visible=False)
    row_updates = [gr.update(visible=False)] * MAX_IMAGES
    image_updates = [gr.update(value=None)] * MAX_IMAGES
    markdown_updates = [gr.update(value="")] * MAX_IMAGES
    if not files:
        yield (gallery_update, *row_updates, *image_updates, *markdown_updates)
        return
    if len(files) > MAX_IMAGES:
        gr.Warning(f"Max {MAX_IMAGES} images allowed. Analyzing the first {MAX_IMAGES}.")
        files = files[:MAX_IMAGES]
    filepaths = [f.name for f in files]
    gallery_update = gr.update(value=filepaths, visible=True)
    for i in range(MAX_IMAGES):
        if i < len(files):
            row_updates[i] = gr.update(visible=True)
            image_updates[i] = gr.update(value=filepaths[i])
            markdown_updates[i] = gr.update(value="⌛ Pending analysis...")
        else:
            row_updates[i] = gr.update(visible=False)
            image_updates[i] = gr.update(value=None)
            markdown_updates[i] = gr.update(value="")
    yield (gallery_update, *row_updates, *image_updates, *markdown_updates)
    if not is_gemini_configured:
        for i in range(len(files)):
             markdown_updates[i] = gr.update(value="### Analysis Disabled\nGemini API not configured.")
        yield (gallery_update, *row_updates, *image_updates, *markdown_updates)
        return
    for i in range(len(files)):
        markdown_updates[i] = gr.update(value=f"⏳ Analyzing Image {i+1}...")
        yield (gallery_update, *row_updates, *image_updates, *markdown_updates)
        try:
            img = Image.open(filepaths[i])
            response = await gemini_model.generate_content_async([SYSTEM_PROMPT_IMAGE_ANALYSIS, img], generation_config=genai.GenerationConfig(temperature=0.1))
            markdown_updates[i] = gr.update(value=response.text)
        except Exception as e:
            traceback.print_exc()
            markdown_updates[i] = gr.update(value=f"### Analysis Failed\nAn error occurred: {e}")
        yield (gallery_update, *row_updates, *image_updates, *markdown_updates)


# generate_detailed_report remains the same.
async def generate_detailed_report(abha_id, uploaded_files, *image_analyses):
    yield "⏳ Generating report...", gr.update(visible=False), gr.update(visible=False, value="")
    if not is_gemini_configured:
        yield "### Report Generation Disabled", gr.update(visible=False), gr.update(visible=False, value="")
        return
    patient_info, visit_summary = await fetch_patient_data(abha_id)
    if "No record found" in patient_info or "Error:" in patient_info:
        yield "### Report Generation Failed", gr.update(visible=False), gr.update(visible=False, value="")
        return
    prompt_context = "Here is all the available information for a patient...\n"
    prompt_context += f"## PATIENT DETAILS & CURRENT VISIT INFO:\n{patient_info}\n\n"
    prompt_context += f"## PAST MEDICAL SUMMARY:\n{visit_summary}\n\n"
    analysis_texts = [text for text in image_analyses if text and "Pending" not in text and "Failed" not in text]
    if analysis_texts:
        prompt_context += "## NEW IMAGE ANALYSIS FINDINGS:\n"
        for i, text in enumerate(analysis_texts):
            prompt_context += f"### Analysis of Image {i+1}\n{text}\n\n"
    else:
        prompt_context += "## NEW IMAGE ANALYSIS FINDINGS:\nNo successful image analyses were performed.\n\n"
    final_prompt = [SYSTEM_PROMPT_DETAILED_REPORT, prompt_context]
    try:
        response = await gemini_model.generate_content_async(final_prompt, generation_config=genai.GenerationConfig(temperature=0.4))
        markdown_report = response.text
        valid_image_paths = [f.name for f in uploaded_files[:MAX_IMAGES]] if uploaded_files else []
        pdf_path = create_report_pdf(markdown_report, valid_image_paths, analysis_texts)
        pdf_update = gr.update(value=pdf_path, visible=True) if pdf_path else gr.update(visible=False)
        yield markdown_report, pdf_update, gr.update(visible=True, value="🔄 Updating database...")
        status_message = await update_google_sheet(abha_id, markdown_report, *analysis_texts)
        yield markdown_report, pdf_update, gr.update(visible=True, value=status_message)
        await asyncio.sleep(3)
        yield markdown_report, pdf_update, gr.update(visible=False)
    except Exception as e:
        traceback.print_exc()
        yield f"### Report Generation Failed: {e}", gr.update(visible=False), gr.update(visible=False)

# ==============================================================================
# 5. GRADIO UI LAYOUT
# ==============================================================================
with gr.Blocks(theme=Base(), title="Advanced Medical Report Generator") as app:
    # This section remains the same.
    gr.Markdown("# Advanced Medical Report Generator")
    with gr.Row():
        abha_id_input = gr.Textbox(label="Enter Patient ABHA ID", scale=3)
        fetch_button = gr.Button("Fetch Patient Details", variant="primary", scale=1)
    with gr.Row(variant="panel"):
        with gr.Column(scale=1):
            with gr.Accordion("Patient Demographics & Current Visit", open=True):
                patient_info_output = gr.Markdown("*Patient details will appear here.*")
        with gr.Column(scale=1):
            with gr.Accordion("Medical History & Visit Summary", open=True):
                summary_output = gr.Markdown("*Patient history will appear here.*")
    gr.Markdown("---")
    gr.Markdown("### 1. Upload Scans & View AI Analysis")
    with gr.Column(variant="panel"):
        image_uploader = gr.File(label=f"Upload up to {MAX_IMAGES} images", file_count="multiple", file_types=["image"])
        image_gallery = gr.Gallery(label="Image Preview", visible=False, columns=5, height="auto")
        analysis_rows, analysis_images, analysis_markdowns = [], [], []
        for i in range(MAX_IMAGES):
            with gr.Row(visible=False, variant='panel') as row:
                with gr.Column(scale=1, min_width=200): img = gr.Image(interactive=False, show_label=False)
                with gr.Column(scale=2): md = gr.Markdown()
                analysis_rows.append(row); analysis_images.append(img); analysis_markdowns.append(md)
    gr.Markdown("---")
    gr.Markdown("### 2. Generate Final Synthesized Report")
    with gr.Column(variant='panel'):
        generate_report_button = gr.Button("Generate Detailed Report & Update Database", variant="primary")
        status_output = gr.Markdown(visible=False)
        gr.Markdown("#### Report Preview")
        report_preview_output = gr.Markdown("*Click the button above to generate a comprehensive, synthesized report.*")
        download_report_button = gr.File(label="Download Report (PDF)", visible=False)

# ==============================================================================
# 6. EVENT LISTENERS
# ==============================================================================
    # This section remains the same.
    fetch_button.click(
        fn=fetch_patient_data,
        inputs=[abha_id_input],
        outputs=[patient_info_output, summary_output]
    )
    image_uploader.change(
        fn=analyze_images_on_upload,
        inputs=[image_uploader],
        outputs=[image_gallery, *analysis_rows, *analysis_images, *analysis_markdowns]
    )
    generate_report_button.click(
        fn=generate_detailed_report,
        inputs=[abha_id_input, image_uploader, *analysis_markdowns],
        outputs=[report_preview_output, download_report_button, status_output]
    )

# ==============================================================================
# 7. LAUNCH APP
# ==============================================================================
if __name__ == "__main__":
    app.launch(share=True, debug=True)