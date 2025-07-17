import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/ui/file-upload";
import { StreamControls } from "@/components/ui/stream-controls";
import { StreamStatus } from "@/components/ui/stream-status";
import { ActivityLog } from "@/components/ui/activity-log";
import { Video, Settings, Youtube, Eye, EyeOff, Repeat, Monitor, Smartphone, MessageCircle, ExternalLink } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AuthGate } from "@/components/ui/auth-gate";
import type { Stream, StreamStatus as StreamStatusType } from "@shared/schema";

export default function StreamDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [streamKey, setStreamKey] = useState("");
  const [streamTitle, setStreamTitle] = useState("");
  const [streamQuality, setStreamQuality] = useState("1080p");
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ filename: string; path: string; size: number } | null>(null);
  const [currentStream, setCurrentStream] = useState<Stream | null>(null);
  const [loopVideo, setLoopVideo] = useState(true);
  const [streamMode, setStreamMode] = useState<'desktop' | 'mobile'>('desktop');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get active stream
  const { data: activeStream } = useQuery<Stream>({
    queryKey: ["/api/streams/active"],
    refetchInterval: 2000,
  });

  // Get stream status
  const { data: streamStatus } = useQuery<StreamStatusType>({
    queryKey: ["/api/stream/status"],
    refetchInterval: 1000,
  });

  // Create stream mutation
  const createStreamMutation = useMutation({
    mutationFn: async (streamData: { title: string; streamKey: string; quality: string }) => {
      const response = await apiRequest('POST', '/api/streams', streamData);
      return response.json();
    },
    onSuccess: (stream) => {
      setCurrentStream(stream);
      toast({
        title: "Stream configured",
        description: "Your stream settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/streams/active"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to save settings",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Update current stream when active stream changes
  useEffect(() => {
    if (activeStream) {
      setCurrentStream(activeStream);
      setStreamTitle(activeStream.title || "");
      setStreamKey(activeStream.streamKey || "");
      setStreamQuality(activeStream.quality || "1080p");
    }
  }, [activeStream]);

  const handleSaveSettings = () => {
    if (!streamKey.trim()) {
      toast({
        title: "Stream key required",
        description: "Please enter your YouTube stream key.",
        variant: "destructive",
      });
      return;
    }

    if (!streamTitle.trim()) {
      toast({
        title: "Stream title required",
        description: "Please enter a title for your stream.",
        variant: "destructive",
      });
      return;
    }

    createStreamMutation.mutate({
      title: streamTitle,
      streamKey: streamKey,
      quality: streamQuality,
    });
  };

  const handleFileUploaded = (file: { filename: string; path: string; size: number }) => {
    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  if (!isAuthenticated) {
    return <AuthGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Video className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-semibold text-gray-900">Bintu Stream Buddy</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  streamStatus?.isStreaming ? 'bg-red-500 live-indicator' : 'bg-gray-400'
                }`} />
                <span className="text-sm text-gray-600">
                  {streamStatus?.isStreaming ? 'Live' : 'Offline'}
                </span>
              </div>
              
              {/* Contact Links */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => window.open('https://youtube.com/@talesofbintu?si=gmk7NywZSjjHXMfR', '_blank')}
                >
                  <Youtube className="h-4 w-4" />
                  <span className="text-xs hidden sm:inline">Channel</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() => window.open('https://wa.me/25429499463', '_blank')}
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-xs hidden sm:inline">WhatsApp</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
              
              <Button variant="ghost" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span className="text-sm hidden sm:inline">Settings</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Streaming Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* File Upload */}
            <FileUpload 
              onFileUploaded={handleFileUploaded}
              selectedFile={selectedFile}
              onRemoveFile={handleRemoveFile}
            />

            {/* Video Preview */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview</h2>
                
                <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <div className="text-center">
                      <Video className="h-16 w-16 mb-4 mx-auto opacity-50" />
                      <p className="text-lg">
                        {selectedFile ? `Preview: ${selectedFile.filename}` : 'Select a video to preview'}
                      </p>
                    </div>
                  </div>
                  
                  {selectedFile && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                      <div className="flex items-center space-x-4">
                        <Button size="sm" variant="ghost" className="text-white hover:text-gray-300">
                          <Video className="h-4 w-4" />
                        </Button>
                        <div className="flex-1 bg-white/20 rounded-full h-1">
                          <div className="bg-white rounded-full h-1 w-1/3"></div>
                        </div>
                        <span className="text-white text-sm">Ready to stream</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stream Controls */}
            <StreamControls
              streamId={currentStream?.id}
              filePath={selectedFile?.path}
              isStreaming={streamStatus?.isStreaming || false}
              streamDuration={streamStatus?.duration || "00:00:00"}
              connectionStatus={streamStatus?.connectionStatus || "disconnected"}
              loop={loopVideo}
              streamMode={streamMode}
            />
          </div>

          {/* Configuration Panel */}
          <div className="space-y-6">
            
            {/* YouTube Configuration */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Youtube className="h-5 w-5 text-red-500" />
                  <span>YouTube Live</span>
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="streamKey">Stream Key</Label>
                    <div className="relative mt-1">
                      <Input
                        id="streamKey"
                        type={showStreamKey ? "text" : "password"}
                        placeholder="Enter your YouTube stream key"
                        value={streamKey}
                        onChange={(e) => setStreamKey(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => setShowStreamKey(!showStreamKey)}
                      >
                        {showStreamKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Get your stream key from YouTube Studio
                    </p>
                    {streamKey && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 text-xs"
                        onClick={async () => {
                          try {
                            const response = await apiRequest('POST', '/api/stream/test', { streamKey });
                            const result = await response.json();
                            toast({
                              title: "Stream Key Valid",
                              description: result.message,
                            });
                          } catch (error) {
                            toast({
                              title: "Stream Key Invalid",
                              description: error instanceof Error ? error.message : "Stream key format is invalid",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        Test Stream Key
                      </Button>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="streamTitle">Stream Title</Label>
                    <Input
                      id="streamTitle"
                      placeholder="Live Stream Title"
                      value={streamTitle}
                      onChange={(e) => setStreamTitle(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="quality">Quality</Label>
                    <Select value={streamQuality} onValueChange={setStreamQuality}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                        <SelectItem value="720p">720p (HD)</SelectItem>
                        <SelectItem value="480p">480p (SD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <Label className="text-sm font-medium">Loop Video</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <input
                          type="checkbox"
                          id="loopVideo"
                          checked={loopVideo}
                          onChange={(e) => setLoopVideo(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="loopVideo" className="text-sm flex items-center space-x-1">
                          <Repeat className="h-3 w-3" />
                          <span>Repeat</span>
                        </Label>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Stream Mode</Label>
                      <Select value={streamMode} onValueChange={(value: 'desktop' | 'mobile') => setStreamMode(value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desktop">
                            <div className="flex items-center space-x-2">
                              <Monitor className="h-4 w-4" />
                              <span>Desktop</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="mobile">
                            <div className="flex items-center space-x-2">
                              <Smartphone className="h-4 w-4" />
                              <span>Mobile</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleSaveSettings}
                    className="w-full"
                    disabled={createStreamMutation.isPending}
                  >
                    {createStreamMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Stream Status */}
            <StreamStatus
              connectionStatus={streamStatus?.connectionStatus || "disconnected"}
              uploadSpeed={streamStatus?.uploadSpeed || "0 Mbps"}
              viewerCount={streamStatus?.viewerCount || 0}
              droppedFrames={streamStatus?.droppedFrames || 0}
            />

            {/* Activity Log */}
            <ActivityLog />
          </div>
        </div>
      </div>
    </div>
  );
}
