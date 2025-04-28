"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { analyzeVideo, VideoAnalysisResult, isValidYouTubeUrl, VideoSource, askFollowUpQuestion } from "@/lib/gemini";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SendIcon } from "lucide-react";

export default function Home() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<VideoAnalysisResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [inputMethod, setInputMethod] = useState<"file" | "youtube">("file");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [includeTranscription, setIncludeTranscription] = useState<boolean>(false);
  const [includeVisualDescription, setIncludeVisualDescription] = useState<boolean>(false);
  const [includeShotAnalysis, setIncludeShotAnalysis] = useState<boolean>(false);
  const [includeLipFlapAnalysis, setIncludeLipFlapAnalysis] = useState<boolean>(false);
  const [includeSummary, setIncludeSummary] = useState<boolean>(false);
  const [followUpQuestion, setFollowUpQuestion] = useState<string>("");
  const [isAskingQuestion, setIsAskingQuestion] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "assistant", content: string }>>([]);

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
    setChatHistory([]); // Reset chat history when analyzing a new video

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
            includeVisualDescription,
            includeShotAnalysis,
            includeLipFlapAnalysis,
            includeSummary
          }
        : { 
            type: "youtube", 
            data: youtubeUrl, 
            customPrompt: customPrompt || undefined,
            includeTranscription,
            includeVisualDescription,
            includeShotAnalysis,
            includeLipFlapAnalysis,
            includeSummary
          };
        
      const result = await analyzeVideo(videoSource);
      setAnalysisResult(result);
      
      // Add the initial summary to chat history
      if (result.summary) {
        setChatHistory([
          { role: "assistant", content: result.summary }
        ]);
      }
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

  const handleAskQuestion = async () => {
    if (!followUpQuestion.trim() || !analysisResult?.sessionId) return;
    
    setIsAskingQuestion(true);
    
    // Add user question to chat history
    setChatHistory(prev => [...prev, { role: "user", content: followUpQuestion }]);
    
    try {
      const response = await askFollowUpQuestion(analysisResult.sessionId, followUpQuestion);
      
      // Add assistant response to chat history
      setChatHistory(prev => [...prev, { role: "assistant", content: response }]);
      
      // Clear the question input
      setFollowUpQuestion("");
    } catch (error) {
      console.error("Error asking follow-up question:", error);
      setChatHistory(prev => [...prev, { role: "assistant", content: "Failed to get a response. Please try again." }]);
    } finally {
      setIsAskingQuestion(false);
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
                    id="summary" 
                    checked={includeSummary}
                    onCheckedChange={(checked: boolean | "indeterminate") => setIncludeSummary(checked === true)}
                    className="border-slate-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <Label htmlFor="summary" className="text-slate-300">
                    Include Summary
                  </Label>
                </div>
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
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="shot-analysis" 
                    checked={includeShotAnalysis}
                    onCheckedChange={(checked: boolean | "indeterminate") => setIncludeShotAnalysis(checked === true)}
                    className="border-slate-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <Label htmlFor="shot-analysis" className="text-slate-300">
                    Include Shot Analysis
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="lip-flap-analysis"
                    checked={includeLipFlapAnalysis}
                    onCheckedChange={(checked: boolean | "indeterminate") => setIncludeLipFlapAnalysis(checked === true)}
                    className="border-slate-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <Label htmlFor="lip-flap-analysis" className="text-slate-300">
                    Include Lip Flap Analysis
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
                    <TabsList className="grid grid-cols-5 mb-4 bg-slate-700">
                      <TabsTrigger value="summary" className="data-[state=active]:bg-slate-600">Summary</TabsTrigger>
                      <TabsTrigger value="transcription" className="data-[state=active]:bg-slate-600" disabled={!includeTranscription}>Transcription</TabsTrigger>
                      <TabsTrigger value="visual" className="data-[state=active]:bg-slate-600" disabled={!includeVisualDescription}>Visual Description</TabsTrigger>
                      <TabsTrigger value="shot-analysis" className="data-[state=active]:bg-slate-600" disabled={!includeShotAnalysis}>Shot Analysis</TabsTrigger>
                      <TabsTrigger value="lip-flap-analysis" className="data-[state=active]:bg-slate-600" disabled={!includeLipFlapAnalysis}>Lip Flap Analysis</TabsTrigger>
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
                    <TabsContent value="shot-analysis" className="mt-0">
                      <div className="p-4 bg-slate-700 rounded-md">
                        {analysisResult.shotAnalysis ? (
                          <div className="space-y-4">
                            {analysisResult.shotAnalysis.map((shot, index) => (
                              <div key={index} className="p-3 bg-slate-600 rounded-md">
                                <p className="text-slate-300">
                                  <span className="font-semibold">ID:</span> {shot.uniqueId}<br />
                                  <span className="font-semibold">Timestamp:</span> {shot.timestamp}<br />
                                  <span className="font-semibold">Shot Type:</span> {shot.shotType}<br />
                                  <span className="font-semibold">Frame:</span> {shot.frame}<br />
                                  <span className="font-semibold">Movement:</span> {shot.movement}<br />
                                  <span className="font-semibold">Eyeline:</span> {shot.eyeline}<br />
                                  <span className="font-semibold">Camera:</span> {shot.camera}<br />
                                  <span className="font-semibold">Angle:</span> {shot.angle}<br />
                                  <span className="font-semibold">Lens:</span> {shot.lens}<br />
                                  <span className="font-semibold">Character:</span> {shot.character}<br />
                                  <span className="font-semibold">Character Actions:</span><br />
                                  {shot.characterActions.map((action, actionIndex) => (
                                    <span key={actionIndex} className="ml-4 block">
                                      {action.character}: {action.action}
                                    </span>
                                  ))}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-300">No shot analysis available.</p>
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent value="lip-flap-analysis" className="mt-0">
                      <div className="p-4 bg-slate-700 rounded-md">
                        {analysisResult.lipFlapAnalysis ? (
                          <div className="space-y-4">
                            {analysisResult.lipFlapAnalysis.map((lipFlap, index) => (
                              <div key={index} className="p-3 bg-slate-600 rounded-md">
                                <p className="text-slate-300">
                                  <span className="font-semibold">Timestamp:</span> {lipFlap.timestamp}<br />
                                  <span className="font-semibold">Character:</span> {lipFlap.character}<br />
                                  <span className="font-semibold">Confidence:</span> {lipFlap.confidence}%<br />
                                  {lipFlap.notes && (
                                    <>
                                      <span className="font-semibold">Notes:</span> {lipFlap.notes}
                                    </>
                                  )}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-300">No lip-flap analysis available.</p>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>

            {/* Follow-up Questions Section */}
            <Card className="bg-slate-800 border-slate-700 mt-6">
              <CardHeader>
                <CardTitle className="text-white">Ask Follow-up Questions</CardTitle>
                <CardDescription className="text-slate-400">
                  Ask specific questions about the video content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Chat History */}
                  <div className="bg-slate-700 rounded-md p-4 max-h-80 overflow-y-auto">
                    {chatHistory.length === 0 ? (
                      <p className="text-slate-400 text-center py-4">No conversation yet. Ask a question to get started.</p>
                    ) : (
                      <div className="space-y-4">
                        {chatHistory.map((message, index) => (
                          <div 
                            key={index} 
                            className={`p-3 rounded-md ${
                              message.role === "user" 
                                ? "bg-blue-600/20 ml-auto max-w-[80%]" 
                                : "bg-slate-600/50 mr-auto max-w-[80%]"
                            }`}
                          >
                            <p className="text-slate-300 whitespace-pre-wrap">{message.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Question Input */}
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Ask a question about the video..."
                      value={followUpQuestion}
                      onChange={(e) => setFollowUpQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAskQuestion();
                        }
                      }}
                      className="bg-slate-700 border-slate-600 text-slate-300"
                      disabled={isAskingQuestion}
                    />
                    <Button 
                      onClick={handleAskQuestion}
                      disabled={isAskingQuestion || !followUpQuestion.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <SendIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  {isAskingQuestion && (
                    <p className="text-sm text-slate-400">Thinking...</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </main>
  );
}
