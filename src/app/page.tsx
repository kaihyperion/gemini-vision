"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { analyzeVideo, VideoAnalysisResult, isValidYouTubeUrl, VideoSource } from "@/lib/gemini";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export default function Home() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<VideoAnalysisResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [inputMethod, setInputMethod] = useState<"file" | "youtube">("file");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [includeTranscription, setIncludeTranscription] = useState<boolean>(true);
  const [includeVisualDescription, setIncludeVisualDescription] = useState<boolean>(true);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("video/")) {
      setVideoFile(file);
      setAnalysisResult(null);
    }
  };

  const handleYoutubeUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const url = event.target.value;
    setYoutubeUrl(url);
    setUrlError(null);
    
    if (url && !isValidYouTubeUrl(url)) {
      setUrlError("Please enter a valid YouTube URL");
    }
  };

  const handleAnalyze = async () => {
    if (inputMethod === "file" && !videoFile) return;
    if (inputMethod === "youtube" && (!youtubeUrl || !isValidYouTubeUrl(youtubeUrl))) return;

    setIsAnalyzing(true);
    setUploadProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    try {
      const videoSource: VideoSource = inputMethod === "file" 
        ? { 
            type: "file", 
            data: videoFile as File, 
            customPrompt: customPrompt || undefined,
            includeTranscription,
            includeVisualDescription
          }
        : { 
            type: "youtube", 
            data: youtubeUrl, 
            customPrompt: customPrompt || undefined,
            includeTranscription,
            includeVisualDescription
          };
        
      const result = await analyzeVideo(videoSource);
      setAnalysisResult(result);
    } catch (error) {
      console.error("Error analyzing video:", error);
      setAnalysisResult({
        summary: "",
        error: "Failed to analyze video. Please try again.",
      });
    } finally {
      clearInterval(progressInterval);
      setUploadProgress(100);
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-white mb-2">Video Analysis with Gemini Vision</h1>
          <p className="text-slate-300">Upload a video or provide a YouTube URL to analyze its contents.</p>
        </motion.div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Video Source</CardTitle>
            <CardDescription className="text-slate-400">
              Choose how you want to provide the video for analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex space-x-4 mb-4">
              <Button 
                variant={inputMethod === "file" ? "default" : "outline"} 
                onClick={() => setInputMethod("file")}
                className={inputMethod === "file" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-600 text-slate-300"}
              >
                Upload File
              </Button>
              <Button 
                variant={inputMethod === "youtube" ? "default" : "outline"} 
                onClick={() => setInputMethod("youtube")}
                className={inputMethod === "youtube" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-600 text-slate-300"}
              >
                YouTube URL
              </Button>
            </div>

            {inputMethod === "file" ? (
              <div className="space-y-2">
                <Label htmlFor="video" className="text-slate-300">
                  Video File
                </Label>
                <input
                  id="video"
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-slate-300
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-slate-700 file:text-slate-300
                    hover:file:bg-slate-600"
                />
                {videoFile && (
                  <p className="text-slate-300 mt-2">Selected file: {videoFile.name}</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="youtube-url" className="text-slate-300">
                  YouTube URL
                </Label>
                <Input
                  id="youtube-url"
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={handleYoutubeUrlChange}
                  className="bg-slate-700 border-slate-600 text-slate-300"
                />
                {urlError && (
                  <p className="text-red-400 text-sm mt-1">{urlError}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="custom-prompt" className="text-slate-300">
                Custom Analysis Prompt (Optional)
              </Label>
              <Input
                id="custom-prompt"
                type="text"
                placeholder="Enter your custom prompt for video analysis..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="bg-slate-700 border-slate-600 text-slate-300"
              />
              <p className="text-sm text-slate-400">
                Leave empty to use the default analysis prompt
              </p>
            </div>

            <div className="space-y-4">
              <Label className="text-slate-300">Analysis Options</Label>
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="transcription" 
                    checked={includeTranscription}
                    onCheckedChange={(checked: boolean | "indeterminate") => setIncludeTranscription(checked === true)}
                    className="border-slate-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <Label htmlFor="transcription" className="text-slate-300">
                    Include Transcription
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="visual-description" 
                    checked={includeVisualDescription}
                    onCheckedChange={(checked: boolean | "indeterminate") => setIncludeVisualDescription(checked === true)}
                    className="border-slate-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <Label htmlFor="visual-description" className="text-slate-300">
                    Include Visual Description
                  </Label>
                </div>
              </div>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || (inputMethod === "file" ? !videoFile : !youtubeUrl || !!urlError)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isAnalyzing ? "Analyzing..." : "Analyze Video"}
            </Button>

            {isAnalyzing && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="bg-slate-700" />
                <p className="text-sm text-slate-400">Processing video...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {analysisResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Analysis Results</CardTitle>
                <CardDescription className="text-slate-400">
                  Here&apos;s what Gemini Vision found in your video
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysisResult.error ? (
                  <p className="text-red-400">{analysisResult.error}</p>
                ) : (
                  <Tabs defaultValue="summary" className="w-full">
                    <TabsList className="grid grid-cols-3 mb-4 bg-slate-700">
                      <TabsTrigger value="summary" className="data-[state=active]:bg-slate-600">Summary</TabsTrigger>
                      <TabsTrigger value="transcription" className="data-[state=active]:bg-slate-600" disabled={!includeTranscription}>Transcription</TabsTrigger>
                      <TabsTrigger value="visual" className="data-[state=active]:bg-slate-600" disabled={!includeVisualDescription}>Visual Description</TabsTrigger>
                    </TabsList>
                    <TabsContent value="summary" className="mt-0">
                      <div className="p-4 bg-slate-700 rounded-md">
                        <p className="text-slate-300 whitespace-pre-wrap">{analysisResult.summary}</p>
                      </div>
                    </TabsContent>
                    <TabsContent value="transcription" className="mt-0">
                      <div className="p-4 bg-slate-700 rounded-md">
                        <p className="text-slate-300 whitespace-pre-wrap">{analysisResult.transcription || "No transcription available."}</p>
                      </div>
                    </TabsContent>
                    <TabsContent value="visual" className="mt-0">
                      <div className="p-4 bg-slate-700 rounded-md">
                        <p className="text-slate-300 whitespace-pre-wrap">{analysisResult.visualDescription || "No visual description available."}</p>
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </main>
  );
}
