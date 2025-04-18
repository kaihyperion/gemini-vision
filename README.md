# Video Analysis with Gemini Vision

A Next.js application that allows users to upload videos or provide YouTube URLs to get AI-powered analysis using Google's Gemini Vision model.

## Features

- Video upload and analysis
- YouTube URL analysis
- Video transcription with speaker identification
- Detailed visual descriptions of video content
- Real-time progress tracking
- Beautiful UI with Framer Motion animations
- Responsive design
- Error handling

## Prerequisites

- Node.js 18.x or later
- A Google Cloud account with Gemini API access
- Gemini API key

## Local Development

1. Clone the repository:
```bash
git clone <repository-url>
cd <repository-name>
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory and add your Gemini API key:
```
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Choose your video source:
   - **Upload File**: Click "Upload File" and select a video file from your device
   - **YouTube URL**: Click "YouTube URL" and paste a valid YouTube video URL

2. Click "Analyze Video" to start the analysis

3. Wait for the analysis to complete

4. View the results in the Analysis Results card:
   - **Summary**: Get a high-level overview of the video content
   - **Transcription**: Read the transcribed speech from the video with speaker identification
   - **Visual Description**: See a detailed description of the visual elements in the video

## Deployment

### GitHub

1. Create a new repository on GitHub
2. Initialize Git in your project (if not already done):
```bash
git init
```

3. Add your files and commit:
```bash
git add .
git commit -m "Initial commit"
```

4. Add your GitHub repository as remote and push:
```bash
git remote add origin https://github.com/yourusername/your-repo-name.git
git branch -M main
git push -u origin main
```

### Vercel

1. Go to [Vercel](https://vercel.com/) and sign in with your GitHub account
2. Click "Add New" > "Project"
3. Import your GitHub repository
4. Configure your project:
   - Framework Preset: Next.js
   - Build Command: `next build`
   - Output Directory: `.next`
   - Install Command: `npm install`
5. Add your environment variables:
   - Name: `NEXT_PUBLIC_GEMINI_API_KEY`
   - Value: Your Gemini API key
6. Click "Deploy"

Your application will be deployed and accessible at a Vercel URL (e.g., `https://your-app-name.vercel.app`).

## Technologies Used

- Next.js 14
- TypeScript
- React
- Framer Motion
- shadcn/ui
- Google Generative AI SDK
- Tailwind CSS

## License

MIT
