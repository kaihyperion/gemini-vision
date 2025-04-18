import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

export type VideoAnalysisResult = {
  summary: string;
  transcription?: string;
  visualDescription?: string;
  error?: string;
};

export type VideoSource = {
  type: "file" | "youtube";
  data: File | string; // File for upload, string for YouTube URL
};

export async function analyzeVideo(videoSource: VideoSource): Promise<VideoAnalysisResult> {
  try {
    let videoData;
    
    if (videoSource.type === "file") {
      // Convert video file to base64
      const base64Video = await fileToBase64(videoSource.data as File);
      
      videoData = {
        inlineData: {
          data: base64Video,
          mimeType: (videoSource.data as File).type,
        },
      };
    } else {
      // For YouTube URLs, we'll use the URL directly
      videoData = {
        text: videoSource.data as string,
      };
    }
    
    // Get the Gemini Pro Vision model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Generate content with the video for summary
    const summaryResult = await model.generateContent([
      "Please analyze this video and provide a detailed summary of what's happening in it. Focus on the main events, actions, and any notable details.",
      videoData,
    ]);

    // Generate content with the video for transcription
    const transcriptionResult = await model.generateContent([
      "Please transcribe the speech in this video. Include timestamps if possible and identify different speakers if there are multiple people talking.",
      videoData,
    ]);

    // Generate content with the video for visual description
    const visualResult = await model.generateContent([
      "Please provide a detailed visual description of this video. Focus on the visual elements, scenes, objects, people, and their actions. Describe the visual style, camera angles, and any notable visual effects.",
      videoData,
    ]);

    const summaryResponse = await summaryResult.response;
    const transcriptionResponse = await transcriptionResult.response;
    const visualResponse = await visualResult.response;

    return {
      summary: summaryResponse.text(),
      transcription: transcriptionResponse.text(),
      visualDescription: visualResponse.text(),
    };
  } catch (error) {
    console.error("Error analyzing video:", error);
    return {
      summary: "",
      error: "Failed to analyze video. Please try again.",
    };
  }
}

// Helper function to convert File to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === "string") {
        // Remove the data URL prefix (e.g., "data:video/mp4;base64,")
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = (error) => reject(error);
  });
}

// Helper function to validate YouTube URL
export function isValidYouTubeUrl(url: string): boolean {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}$/;
  return youtubeRegex.test(url);
} 