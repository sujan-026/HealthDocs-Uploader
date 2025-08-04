# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/fecd0122-7d22-44b5-8739-21c8f0e1c12b

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/fecd0122-7d22-44b5-8739-21c8f0e1c12b) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## AI Services Configuration

This application uses AI services for medical document analysis. You can configure either or both of the following services:

### Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Google Gemini API Key (Primary service)
# Get your API key from: https://makersuite.google.com/app/apikey
VITE_GOOGLE_API_KEY=your_gemini_api_key_here

# Moondream API Key (Fallback service)
# Get your API key from: https://moondream.ai/
VITE_MOONDREAM_API_KEY=your_moondream_api_key_here
```

### Service Priority

- **Both configured**: Gemini is used as primary with Moondream as fallback
- **Only Gemini**: Gemini is used as primary (no fallback)
- **Only Moondream**: Moondream is used as primary service
- **Neither configured**: Application will show an error

### Testing API Keys

You can test your API key configuration by running:

```typescript
import { checkAIServiceStatus } from './src/utils/aiServiceStatus';

// Check status of all AI services
const status = await checkAIServiceStatus();
console.log(status);
```

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/fecd0122-7d22-44b5-8739-21c8f0e1c12b) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
