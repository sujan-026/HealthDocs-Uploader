from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import asyncio
import gspread
from google.oauth2.service_account import Credentials
import os
import google.generativeai as genai
from PIL import Image
import traceback
import time
import re
from dotenv import load_dotenv
import io
import uvicorn
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import navy, dimgrey
from reportlab.platypus import Image as RLImage

# Load environment variables from .env file
load_dotenv()

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
# 2. SYSTEM PROMPTS
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
# 3. PYDANTIC MODELS
# ==============================================================================

class PatientDataResponse(BaseModel):
    patient_info: str
    summary_text: str

class ImageAnalysisResponse(BaseModel):
    analysis: str
    success: bool
    error: Optional[str] = None

class ReportGenerationResponse(BaseModel):
    report: str
    success: bool
    error: Optional[str] = None
    database_update_status: Optional[str] = None
    pdf_path: Optional[str] = None

# ==============================================================================
# 4. FASTAPI APP SETUP
# ==============================================================================

app = FastAPI(title="Medical Report API", version="1.0.0")

# Add CORS middleware to allow React frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000", 
        "http://localhost:8080",  # Your current Vite dev server
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080",
        "http://localhost:4173",  # Vite preview
        "http://127.0.0.1:4173"   # Vite preview
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ==============================================================================
# 5. PDF GENERATION
# ==============================================================================

def create_report_pdf(markdown_text: str, image_paths: List[str], image_analyses: List[str]) -> Optional[str]:
    """Create a PDF report from markdown text and image analyses"""
    try:
        pdf_path = f"temp_report_{int(time.time())}.pdf"
        doc = SimpleDocTemplate(
            pdf_path, 
            pagesize=A4, 
            topMargin=0.75*inch, 
            bottomMargin=0.75*inch, 
            leftMargin=0.75*inch, 
            rightMargin=0.75*inch
        )
        
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(
            name='TitleStyle', 
            fontName='Helvetica-Bold', 
            fontSize=18, 
            alignment=1,  # Center alignment
            textColor=navy, 
            spaceAfter=24
        ))
        styles.add(ParagraphStyle(
            name='HeadingStyle', 
            fontName='Helvetica-Bold', 
            fontSize=14, 
            textColor=navy, 
            spaceBefore=12, 
            spaceAfter=6
        ))
        styles.add(ParagraphStyle(
            name='Justify', 
            parent=styles['Normal'], 
            alignment=4  # Justify alignment
        ))
        styles.add(ParagraphStyle(
            name='BulletStyle', 
            parent=styles['Justify'], 
            leftIndent=20, 
            spaceAfter=4
        ))
        styles.add(ParagraphStyle(
            name='ImageTitle', 
            parent=styles['Normal'], 
            alignment=1,  # Center alignment
            spaceBefore=18, 
            spaceAfter=4, 
            fontName='Helvetica-Bold'
        ))
        styles.add(ParagraphStyle(
            name='ImageCaption', 
            parent=styles['Normal'], 
            alignment=1,  # Center alignment
            spaceAfter=12, 
            fontName='Helvetica-Oblique', 
            textColor=dimgrey, 
            fontSize=9
        ))

        story = [Paragraph("Comprehensive Medical Report", styles['TitleStyle'])]
        
        for line in markdown_text.split('\n'):
            line = line.strip()
            if not line: 
                continue
            line = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', line)
            if line.startswith('### '): 
                story.append(Paragraph(line.replace('### ', ''), styles['HeadingStyle']))
            elif line.startswith('* '): 
                story.append(Paragraph(f"• {line.replace('* ', '', 1)}", styles['BulletStyle']))
            else: 
                story.append(Paragraph(line, styles['Justify']))

        if image_paths and image_analyses:
            story.append(PageBreak())
            story.append(Paragraph("Medical Images & Analysis", styles['HeadingStyle']))
            story.append(Paragraph("The following images were analyzed to generate this report:", styles['Normal']))
            story.append(Spacer(1, 12))
            
            for i, img_path in enumerate(image_paths):
                if i < len(image_analyses):
                    analysis_text = image_analyses[i]
                    
                    # Extract key information from analysis
                    patient_info = "Patient information not found"
                    document_type = "Document type not specified"
                    key_findings = "No specific findings"
                    
                    # Extract patient info
                    patient_match = re.search(r"Name:\s*\[([^\]]+)\]", analysis_text)
                    if patient_match:
                        patient_info = patient_match.group(1)
                    
                    # Extract document type
                    type_match = re.search(r"Classify the file into one of these categories:\s*\n\n([^:]+)", analysis_text)
                    if type_match:
                        document_type = type_match.group(1).strip()
                    
                    # Extract key findings
                    findings_match = re.search(r"2\.\s*\*\*Key Findings\*\*\n(.*?)(?=\n\n|\n3\.|\Z)", analysis_text, re.DOTALL | re.IGNORECASE)
                    if findings_match:
                        key_findings = findings_match.group(1).strip()
                    
                    story.append(Paragraph(f"<b>Document {i+1}: {document_type}</b>", styles['ImageTitle']))
                    story.append(Paragraph(f"<i>Patient: {patient_info}</i>", styles['ImageCaption']))
                    story.append(Paragraph(f"<b>Key Findings:</b> {key_findings}", styles['Normal']))
                    
                    try:
                        img = RLImage(img_path, width=6*inch, height=6*inch, kind='proportional')
                        img.hAlign = 'CENTER'
                        story.append(img)
                        story.append(Spacer(1, 20))
                    except Exception as e: 
                        story.append(Paragraph(f"<i>Error displaying image {i+1}: {str(e)}</i>", styles['Normal']))
                        story.append(Spacer(1, 20))
        
        doc.build(story)
        return pdf_path
    except Exception as e:
        traceback.print_exc()
        return None

# ==============================================================================
# 6. CORE FUNCTIONS (from original code)
# ==============================================================================

async def fetch_patient_data(abha_id: str):
    """Fetch patient data from Google Sheets"""
    if not abha_id:
        return "*Patient details will appear here.*", "*Patient history will appear here.*"

    try:
        if is_sheets_authenticated:
            all_values = ws.get_all_values()
            if len(all_values) < 2: 
                return "Spreadsheet has no data records.", ""
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

        # Build markdown strings based on the defined order with proper spacing
        patient_info_md = "\n\n".join([f"**{h.replace('_', ' ').title()}:** {record.get(h, 'N/A')}" for h in demographics_headers])
        
        # Format summary text with better structure and spacing
        summary_parts = []
        for h in history_headers:
            value = record.get(h, 'N/A')
            if h == "Summary" and value and value != 'N/A':
                # Format summary with better structure
                summary_parts.append(f"**{h.replace('_', ' ').title()}:**\n\n{value}")
            else:
                summary_parts.append(f"**{h.replace('_', ' ').title()}:** {value}")
        
        summary_text = "\n\n---\n\n".join(summary_parts)
        
        return patient_info_md, summary_text
    except Exception as e:
        traceback.print_exc()
        return f"**Error:** An error occurred while fetching data: {e}", ""

async def analyze_image_with_gemini(image_data: bytes) -> str:
    """Analyze medical image with Gemini AI"""
    if not is_gemini_configured:
        return "### Analysis Disabled\nGemini API not configured."
    
    try:
        # Convert bytes to PIL Image
        img = Image.open(io.BytesIO(image_data))
        
        # Generate analysis with Gemini
        response = await gemini_model.generate_content_async(
            [SYSTEM_PROMPT_IMAGE_ANALYSIS, img], 
            generation_config=genai.GenerationConfig(temperature=0.1)
        )
        return response.text
    except Exception as e:
        traceback.print_exc()
        return f"### Analysis Failed\nAn error occurred: {e}"

# ==============================================================================
# 4. CORE LOGIC
# ==============================================================================

# **UPGRADED**: Now uses header names, not letters, for robust updates.
async def update_google_sheet(abha_id: str, report_text: str, *image_analyses):
    if not is_sheets_authenticated:
        print("Google Sheets not authenticated. Skipping database update.")
        return "Could not update Sheet: Authentication failed."
    try:
        print(f"Attempting to update Google Sheet for ABHA ID: {abha_id}")
        cell = ws.find(abha_id, in_column=1)
        if not cell:
            print(f"ABHA ID {abha_id} not found. Skipping update.")
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
        return "❌ Database update failed. See console for details."

# ==============================================================================
# 6. API ENDPOINTS
# ==============================================================================

@app.get("/")
async def root():
    return {"message": "Medical Report API is running", "status": "healthy"}

@app.get("/api/patient/{abha_id}", response_model=PatientDataResponse)
async def get_patient_data(abha_id: str):
    """Fetch patient data by ABHA ID"""
    try:
        patient_info, summary_text = await fetch_patient_data(abha_id)
        return PatientDataResponse(
            patient_info=patient_info,
            summary_text=summary_text
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching patient data: {str(e)}")

@app.post("/api/analyze-image", response_model=ImageAnalysisResponse)
async def analyze_medical_image(file: UploadFile = File(...)):
    """Analyze uploaded medical image"""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image data
        image_data = await file.read()
        
        # Analyze with Gemini
        analysis = await analyze_image_with_gemini(image_data)
        
        return ImageAnalysisResponse(
            analysis=analysis,
            success=True
        )
    except Exception as e:
        return ImageAnalysisResponse(
            analysis="",
            success=False,
            error=str(e)
        )

@app.post("/api/generate-report")
async def generate_comprehensive_report(
    abha_id: str = Form(...),
    files: List[UploadFile] = File(...)
):
    """Generate comprehensive medical report with patient data and image analyses"""
    try:
        if not is_gemini_configured:
            raise HTTPException(status_code=503, detail="Gemini API not configured")
        
        # Fetch patient data
        patient_info, visit_summary = await fetch_patient_data(abha_id)
        
        if "No record found" in patient_info or "Error:" in patient_info:
            raise HTTPException(status_code=404, detail="Patient not found or error fetching patient data")
        
        # Analyze each uploaded image and save files for PDF
        image_analyses = []
        temp_image_paths = []
        
        for i, file in enumerate(files[:MAX_IMAGES]):  # Limit to MAX_IMAGES
            if file.content_type.startswith('image/'):
                # Read file data
                image_data = await file.read()
                
                # Analyze with Gemini
                analysis = await analyze_image_with_gemini(image_data)
                if analysis and "Pending" not in analysis and "Failed" not in analysis:
                    image_analyses.append(analysis)
                
                # Save file for PDF generation
                temp_path = f"temp_image_{i}_{int(time.time())}.jpg"
                with open(temp_path, "wb") as f:
                    f.write(image_data)
                temp_image_paths.append(temp_path)
        
        # Build prompt context
        prompt_context = "Here is all the available information for a patient...\n"
        prompt_context += f"## PATIENT DETAILS & CURRENT VISIT INFO:\n{patient_info}\n\n"
        prompt_context += f"## PAST MEDICAL SUMMARY:\n{visit_summary}\n\n"
        
        if image_analyses:
            prompt_context += "## NEW IMAGE ANALYSIS FINDINGS:\n"
            for i, text in enumerate(image_analyses):
                prompt_context += f"### Analysis of Image {i+1}\n{text}\n\n"
        else:
            prompt_context += "## NEW IMAGE ANALYSIS FINDINGS:\nNo successful image analyses were performed.\n\n"
        
        final_prompt = [SYSTEM_PROMPT_DETAILED_REPORT, prompt_context]
        
        # Generate comprehensive report
        response = await gemini_model.generate_content_async(
            final_prompt, 
            generation_config=genai.GenerationConfig(temperature=0.4)
        )
        
        # Update Google Sheet with the generated report
        update_status = await update_google_sheet(abha_id, response.text, *image_analyses)
        if "Failed" in update_status or "Authentication failed" in update_status:
            raise HTTPException(status_code=500, detail=f"Failed to update Google Sheet: {update_status}")

        # Generate PDF report with saved images
        pdf_path = None
        try:
            pdf_path = create_report_pdf(response.text, temp_image_paths, image_analyses)
        except Exception as e:
            print(f"PDF generation failed: {e}")
            # Continue without PDF if generation fails

        return ReportGenerationResponse(
            report=response.text,
            success=True,
            database_update_status=update_status,
            pdf_path=pdf_path
        )
        
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        return ReportGenerationResponse(
            report="",
            success=False,
            error=str(e),
            database_update_status="Failed due to error"
        )

@app.post("/api/generate-report-from-analysis")
async def generate_comprehensive_report_from_analysis(
    abha_id: str = Form(...),
    image_analyses: List[str] = Form(...)
):
    """Generate comprehensive medical report with patient data and pre-analyzed image data"""
    try:
        if not is_gemini_configured:
            raise HTTPException(status_code=503, detail="Gemini API not configured")
        
        # Fetch patient data
        patient_info, visit_summary = await fetch_patient_data(abha_id)
        
        if "No record found" in patient_info or "Error:" in patient_info:
            raise HTTPException(status_code=404, detail="Patient not found or error fetching patient data")
        
        # Filter out any failed or pending analyses
        valid_analyses = [analysis for analysis in image_analyses if analysis and "Pending" not in analysis and "Failed" not in analysis]
        
        # Build prompt context
        prompt_context = "Here is all the available information for a patient...\n"
        prompt_context += f"## PATIENT DETAILS & CURRENT VISIT INFO:\n{patient_info}\n\n"
        prompt_context += f"## PAST MEDICAL SUMMARY:\n{visit_summary}\n\n"
        
        if valid_analyses:
            prompt_context += "## NEW IMAGE ANALYSIS FINDINGS:\n"
            for i, text in enumerate(valid_analyses):
                prompt_context += f"### Analysis of Image {i+1}\n{text}\n\n"
        else:
            prompt_context += "## NEW IMAGE ANALYSIS FINDINGS:\nNo successful image analyses were performed.\n\n"
        
        final_prompt = [SYSTEM_PROMPT_DETAILED_REPORT, prompt_context]
        
        # Generate comprehensive report
        response = await gemini_model.generate_content_async(
            final_prompt, 
            generation_config=genai.GenerationConfig(temperature=0.4)
        )
        
        # Update Google Sheet with the generated report
        update_status = await update_google_sheet(abha_id, response.text, *valid_analyses)
        if "Failed" in update_status or "Authentication failed" in update_status:
            raise HTTPException(status_code=500, detail=f"Failed to update Google Sheet: {update_status}")

        # Generate PDF report (without images since we only have analyses)
        pdf_path = None
        try:
            pdf_path = create_report_pdf(response.text, [], valid_analyses)
        except Exception as e:
            print(f"PDF generation failed: {e}")
            # Continue without PDF if generation fails

        return ReportGenerationResponse(
            report=response.text,
            success=True,
            database_update_status=update_status,
            pdf_path=pdf_path
        )
        
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        return ReportGenerationResponse(
            report="",
            success=False,
            error=str(e),
            database_update_status="Failed due to error"
        )

@app.get("/api/download-pdf/{pdf_filename}")
async def download_pdf(pdf_filename: str):
    """Download generated PDF report"""
    try:
        pdf_path = pdf_filename
        if not os.path.exists(pdf_path):
            raise HTTPException(status_code=404, detail="PDF file not found")
        
        return FileResponse(
            path=pdf_path,
            filename=f"medical_report_{int(time.time())}.pdf",
            media_type="application/pdf"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading PDF: {str(e)}")

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "google_sheets": is_sheets_authenticated,
        "gemini_ai": is_gemini_configured,
        "timestamp": time.time()
    }

# ==============================================================================
# 7. STARTUP
# ==============================================================================

if __name__ == "__main__":
    print("🚀 Starting Medical Report API Server...")
    print(f"📊 Google Sheets: {'✅ Connected' if is_sheets_authenticated else '❌ Offline'}")
    print(f"🤖 Gemini AI: {'✅ Configured' if is_gemini_configured else '❌ Disabled'}")
    
    uvicorn.run(
        "backend_server:app",
        host="localhost",
        port=8000,
        reload=True,
        log_level="info"
    )