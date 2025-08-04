# DocReader - Medical Document Analysis & Patient Management System

A comprehensive healthcare application that combines AI-powered medical document analysis with patient data management through Google Sheets integration.

## 🏥 Project Overview

DocReader is a full-stack healthcare application designed to streamline medical document processing and patient data management. It consists of two main components that work together to provide a complete solution for healthcare providers:

1. **Health-Scan-Share** - Modern React frontend for document upload and analysis
2. **Google Sheet Integration** - Python backend for AI analysis and data management

## 🎯 Key Features

- **AI-Powered Document Analysis**: Automatically analyze medical images, prescriptions, lab reports, and clinical documents
- **Patient Data Management**: Store and retrieve patient information using Google Sheets as a database
- **Multi-Modal Input**: Support for image uploads, camera capture, and voice recordings
- **ABHA Integration**: Verify patient identity using India's Ayushman Bharat Health Account system
- **Real-time Analysis**: Instant AI-powered insights with fallback services
- **PDF Report Generation**: Generate comprehensive medical reports in PDF format
- **Secure Data Handling**: End-to-end encryption and secure API communication

## 🏗️ Architecture

### Frontend (health-scan-share)
- **Technology Stack**: React 18, TypeScript, Vite, Tailwind CSS
- **UI Framework**: shadcn/ui components with Radix UI primitives
- **State Management**: React Query for server state, React Hook Form for forms
- **AI Services**: Google Gemini API (primary), Moondream API (fallback)
- **File Handling**: AWS S3 integration for secure file storage
- **Authentication**: Firebase integration for user management

### Backend (Google Sheet Integration)
- **Technology Stack**: FastAPI, Python, Uvicorn
- **AI Integration**: Google Gemini API for medical document analysis
- **Database**: Google Sheets as a lightweight patient database
- **File Processing**: Support for multiple image formats and PDF generation
- **Authentication**: Google Service Account for secure API access

## 📁 Project Structure

```
DocReader/
├── health-scan-share/          # React frontend application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/             # Application pages
│   │   ├── services/          # API service layer
│   │   ├── utils/             # Utility functions
│   │   └── types/             # TypeScript type definitions
│   ├── public/                # Static assets
│   └── package.json           # Frontend dependencies
│
└── Google Sheet Integration/   # Python backend server
    ├── backend_server.py      # Main FastAPI application
    ├── requirements.txt       # Python dependencies
    ├── start_backend.py       # Server startup script
    └── dbott-*.json          # Google Service Account credentials
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- Google Cloud Platform account
- Google Gemini API key

### Frontend Setup (health-scan-share)

1. **Navigate to the frontend directory**:
   ```bash
   cd health-scan-share
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file with:
   ```env
   VITE_GOOGLE_API_KEY=your_gemini_api_key_here
   VITE_MOONDREAM_API_KEY=your_moondream_api_key_here
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

### Backend Setup (Google Sheet Integration)

1. **Navigate to the backend directory**:
   ```bash
   cd "Google Sheet Integration"
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Google Sheets**:
   - Set up a Google Cloud Project
   - Enable Google Sheets API
   - Create a service account and download credentials
   - Share your Google Sheet with the service account email

4. **Configure environment variables**:
   Create a `.env` file with:
   ```env
   GOOGLE_API_KEY=your_gemini_api_key_here
   GOOGLE_SHEETS_CREDS_PATH=path_to_your_service_account.json
   ```

5. **Start the backend server**:
   ```bash
   python start_backend.py
   ```

## 🔧 Configuration

### AI Services
The application supports multiple AI services for document analysis:

- **Primary**: Google Gemini API (recommended)
- **Fallback**: Moondream API
- **Offline Mode**: Basic analysis without AI features

### Google Sheets Setup
1. Create a Google Sheet named "PatientData"
2. Set up columns matching the expected headers:
   - abha_id, full_name, Age, weight_kg, reason_for_visit
   - allergies, Medication, symptoms_description, Summary
   - image1_summary through image5_summary, executive_summary

## 📊 API Endpoints

### Backend API (FastAPI)
- `GET /api/patient/{abha_id}` - Retrieve patient data
- `POST /api/analyze-image` - Analyze medical images
- `POST /api/generate-report` - Generate comprehensive reports
- `GET /api/download-pdf/{filename}` - Download generated PDFs
- `GET /api/health` - Health check endpoint

## 🔒 Security Features

- **CORS Configuration**: Secure cross-origin requests
- **File Validation**: Type and size validation for uploads
- **API Key Management**: Secure environment variable handling
- **Service Account Authentication**: Secure Google API access
- **Input Sanitization**: Protection against malicious inputs

## 🧪 Testing

### Frontend Testing
```bash
cd health-scan-share
npm run test
```

### Backend Testing
```bash
cd "Google Sheet Integration"
python test_backend.py
```

## 📦 Deployment

### Frontend Deployment
- **Build for production**:
  ```bash
  npm run build
  ```
- **Deploy to Vercel/Netlify**: Connect your repository for automatic deployments

### Backend Deployment
- **Docker**: Use the provided Dockerfile for containerized deployment
- **Cloud Platforms**: Deploy to Heroku, Railway, or Google Cloud Run
- **Local Server**: Use `uvicorn` for production serving

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the documentation in each component directory
- Review the test files for usage examples
- Open an issue on GitHub

## 🔄 Version History

- **v1.0.0**: Initial release with basic document analysis
- **v1.1.0**: Added Google Sheets integration
- **v1.2.0**: Enhanced AI analysis with multiple services
- **v1.3.0**: Added PDF report generation
- **v1.4.0**: Improved UI/UX and ABHA integration

---

**Note**: This project is designed for healthcare applications. Ensure compliance with local healthcare data protection regulations (HIPAA, GDPR, etc.) before deployment in production environments. 