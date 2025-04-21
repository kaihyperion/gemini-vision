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
  customPrompt?: string; // Optional custom prompt for analysis
  includeTranscription?: boolean; // Whether to include transcription in the analysis
  includeVisualDescription?: boolean; // Whether to include visual description in the analysis
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

    // Use custom prompt if provided, otherwise use default prompts
    const summaryPrompt = videoSource.customPrompt || "Please analyze this video and provide a detailed summary of what's happening in it. Focus on the main events, actions, and any notable details.";
    const transcriptionPrompt = "Please transcribe the speech in this video. Include timestamps if possible and identify different speakers if there are multiple people talking.";
    const visualPrompt = "Please provide a detailed visual description of this video. Focus on the visual elements, scenes, objects, people, and their actions. Describe the visual style, camera angles, and any notable visual effects.";

    // Generate content with the video for summary
    const summaryResult = await model.generateContent([
      summaryPrompt,
      videoData,
    ]);

    const summaryResponse = await summaryResult.response;
    let transcription = "";
    let visualDescription = "";

    // Only generate transcription if requested
    if (videoSource.includeTranscription !== false) {
      const transcriptionResult = await model.generateContent([
        transcriptionPrompt,
        videoData,
      ]);
      const transcriptionResponse = await transcriptionResult.response;
      transcription = transcriptionResponse.text();
    }

    // Only generate visual description if requested
    if (videoSource.includeVisualDescription !== false) {
      const visualResult = await model.generateContent([
        visualPrompt,
        videoData,
      ]);
      const visualResponse = await visualResult.response;
      visualDescription = visualResponse.text();
    }

    return {
      summary: summaryResponse.text(),
      transcription: transcription || undefined,
      visualDescription: visualDescription || undefined,
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