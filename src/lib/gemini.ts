import { GoogleGenerativeAI, GenerativeModel, ChatSession } from "@google/generative-ai";

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

export type VideoAnalysisResult = {
  summary?: string;
  transcription?: string;
  visualDescription?: string;
  shotAnalysis?: ShotAnalysis[];
  error?: string;
  sessionId?: string; // Session ID for follow-up questions
};

export type ShotAnalysis = {
  uniqueId: string;
  timestamp: string;
  shotType: 'clean' | 'OTS' | 'dirty-single' | 'POV' | 'insert' | 'two-shot' | 'three-shot' | 'master' | 'moving-master';
  frame: 'wide' | 'cowboy' | 'medium' | 'cu' | 'ecu'; // Camera framing type
  movement: 'push' | 'pull' | 'follow' | 'lead' | 'pan' | 'tilt' | 'tracking' | 'boom-up' | 'boom-down' | 'zoom' | 'static'; // Camera movement type
  camera: 'static' | 'handheld' | 'steadicam' | 'dolly' | 'jib' | 'crane' | 'drone'; // Camera type
  angle: 'eye-level' | 'high' | 'low' | 'dutch' | 'overhead' | 'aerial'; // Camera angle
  lens: 'shallow' | 'deep'; // Depth of field
  eyeline: 'hot' | 'warm' | 'cold'; // Subject's eyeline direction
  character: string; // Character name or character1, character2, etc.
  characterActions: {
    character: string;
    action: 'talking-onscreen' | 'talking-offscreen' | 'listening' | 'silent';
  }[];
};

export type VideoSource = {
  type: "file" | "youtube";
  data: File | string; // File for upload, string for YouTube URL
  customPrompt?: string; // Optional custom prompt for analysis
  includeTranscription?: boolean; // Whether to include transcription in the analysis
  includeVisualDescription?: boolean; // Whether to include visual description in the analysis
  includeShotAnalysis?: boolean; // Whether to include shot analysis in the analysis
  includeSummary?: boolean; // Whether to include summary in the analysis
};

// Store for active chat sessions
const activeChatSessions = new Map<string, {
  model: GenerativeModel;
  videoData: {
    inlineData?: {
      data: string;
      mimeType: string;
    };
    text?: string;
  };
  chat: ChatSession;
}>();

// Generate a unique ID for a video source
function generateSessionId(videoSource: VideoSource): string {
  if (videoSource.type === "file") {
    return `file-${(videoSource.data as File).name}-${Date.now()}`;
  } else {
    return `youtube-${videoSource.data}-${Date.now()}`;
  }
}

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
    const shotAnalysisPrompt = `Analyze this video and identify all different shots. For each shot, provide:
1. The timestamp (from and to) in [MM:SS] format
2. The shot type (clean, OTS, dirty-single, POV, insert, two-shot, three-shot, master, moving-master)
3. The frame type:
   - wide: captures the entire object/person and their surroundings
   - cowboy: frames a subject from mid-thigh to just above the head
   - medium: shows a subject from approximately waist up
   - cu (close-up): taken at close range, showing greater detail of a subject or object
   - ecu (extreme close-up): tight framing that isolates a specific detail or body part
4. The camera movement:
   - push: camera moves toward the subject
   - pull: camera moves away from the subject
   - follow: camera follows a moving subject
   - lead: camera moves ahead of a moving subject
   - pan: camera rotates horizontally
   - tilt: camera rotates vertically
   - tracking: camera moves alongside a subject
   - boom-up: camera moves upward
   - boom-down: camera moves downward
   - zoom: camera lens zooms in or out
   - static: no camera movement
5. The camera type:
   - static: camera mounted on a fixed tripod
   - handheld: camera held by operator, creating natural movement
   - steadicam: camera stabilized on a body-mounted rig
   - dolly: camera mounted on a wheeled platform
   - jib: camera mounted on a mechanical arm
   - crane: camera mounted on a large crane
   - drone: camera mounted on an aerial drone
6. The camera angle:
   - eye-level: camera positioned at the subject's eye level
   - high: camera positioned above the subject looking down
   - low: camera positioned below the subject looking up
   - dutch: camera tilted at an angle (canted angle)
   - overhead: camera positioned directly above the subject
   - aerial: camera positioned high above the ground, typically from a drone or helicopter
7. The lens type:
   - shallow: narrow depth of field, with subject in focus and background blurred
   - deep: wide depth of field, with both subject and background in focus
8. The subject's eyeline:
   - hot: subject is looking directly at the camera
   - warm: subject is looking slightly off-camera but still engaging
   - cold: subject is looking away from the camera
9. The character(s) in the shot. If character names are not available, use character1, character2, etc.
10. For each character in the shot, specify their action:
    - talking-onscreen: Character is speaking and visible on screen
    - talking-offscreen: Character is speaking but not visible on screen
    - listening: Character is listening to another character
    - silent: Character is present but neither speaking nor listening

Return the data in the following exact JSON format:

{
  "shots": [
    {
      "uniqueId": "shot1",
      "timestamp": "[00:00-00:05]",
      "shotType": "clean",
      "frame": "medium",
      "movement": "static",
      "camera": "static",
      "angle": "eye-level",
      "lens": "shallow",
      "eyeline": "warm",
      "character": "character1",
      "characterActions": [
        {
          "character": "character1",
          "action": "talking-onscreen"
        },
        {
          "character": "character2",
          "action": "listening"
        }
      ]
    }
  ]
}

IMPORTANT: Make sure to:
1. Use double quotes for all property names and string values
2. Include commas between properties
3. Include commas between array items
4. Return ONLY the JSON object with no additional text`;

    let summary = "";
    let transcription = "";
    let visualDescription = "";
    let shotAnalysis: ShotAnalysis[] = [];

    // Generate summary only if requested
    if (videoSource.includeSummary !== false) {
      const summaryResult = await model.generateContent([
        summaryPrompt,
        videoData,
      ]);
      const summaryResponse = await summaryResult.response;
      summary = summaryResponse.text();
    }

    // Generate shot analysis if requested
    if (videoSource.includeShotAnalysis) {
      const shotAnalysisResult = await model.generateContent([
        shotAnalysisPrompt,
        videoData,
      ]);
      const shotAnalysisResponse = await shotAnalysisResult.response;
      try {
        // Clean the response by removing markdown formatting and any non-JSON text
        let cleanResponse = shotAnalysisResponse.text()
          .replace(/```json\s*/g, '') // Remove ```json
          .replace(/```\s*/g, '')     // Remove ```
          .replace(/^\s*|\s*$/g, ''); // Trim whitespace

        // Find the first { and last } to extract just the JSON object
        const firstBrace = cleanResponse.indexOf('{');
        const lastBrace = cleanResponse.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          cleanResponse = cleanResponse.slice(firstBrace, lastBrace + 1);
        }

        // Fix common JSON formatting issues
        cleanResponse = cleanResponse
          .replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":') // Fix property names
          .replace(/:\s*([a-zA-Z0-9_-]+)\s*([,}])/g, ':"$1"$2') // Fix string values
          .replace(/:\s*([a-zA-Z0-9_-]+)\s*$/g, ':"$1"') // Fix last string value
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:\s*undefined/g, '$1"$2":null'); // Fix undefined values

        console.log("Raw response:", shotAnalysisResponse.text());
        console.log("Cleaned response:", cleanResponse);

        const parsedResponse = JSON.parse(cleanResponse);
        if (parsedResponse && Array.isArray(parsedResponse.shots)) {
          shotAnalysis = parsedResponse.shots;
        }
      } catch (error) {
        console.error("Error parsing shot analysis JSON:", error);
      }
    }

    // Only generate transcription if requested
    if (videoSource.includeTranscription) {
      const transcriptionResult = await model.generateContent([
        transcriptionPrompt,
        videoData,
      ]);
      const transcriptionResponse = await transcriptionResult.response;
      transcription = transcriptionResponse.text();
    }

    // Only generate visual description if requested
    if (videoSource.includeVisualDescription) {
      const visualResult = await model.generateContent([
        visualPrompt,
        videoData,
      ]);
      const visualResponse = await visualResult.response;
      visualDescription = visualResponse.text();
    }

    // Store the session for follow-up questions
    const sessionId = generateSessionId(videoSource);
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: summaryPrompt }],
        },
        {
          role: "model",
          parts: [{ text: summary }],
        },
      ],
    });

    activeChatSessions.set(sessionId, {
      model,
      videoData,
      chat,
    });

    return {
      summary: summary || undefined,
      transcription: transcription || undefined,
      visualDescription: visualDescription || undefined,
      shotAnalysis: shotAnalysis.length > 0 ? shotAnalysis : undefined,
      sessionId, // Return the session ID for follow-up questions
    };
  } catch (error) {
    console.error("Error analyzing video:", error);
    return {
      summary: "",
      error: "Failed to analyze video. Please try again.",
    };
  }
}

// Function to ask follow-up questions about a video
export async function askFollowUpQuestion(sessionId: string, question: string): Promise<string> {
  try {
    const session = activeChatSessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found. Please analyze the video again.");
    }

    const { chat } = session;
    const result = await chat.sendMessage(question);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error asking follow-up question:", error);
    return "Failed to get a response. Please try again.";
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