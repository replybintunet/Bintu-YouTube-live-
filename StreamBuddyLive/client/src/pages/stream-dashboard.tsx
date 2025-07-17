import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [streamKey1, setStreamKey1] = useState("");
  const [streamKey2, setStreamKey2] = useState("");
  const [streamTitle, setStreamTitle] = useState("");
  const [streamQuality, setStreamQuality] = useState("1080p");
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ filename: string; path: string; size: number } | null>(null);
  const [currentStream, setCurrentStream] = useState<Stream | null>(null);
  const [loopVideo, setLoopVideo] = useState(true);
  const [streamMode, setStreamMode] = useState<'desktop' | 'mobile'>('desktop');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: activeStream } = useQuery<Stream>({
    queryKey: ["/api/streams/active"],
    refetchInterval: 2000,
  });

  const { data: streamStatus } = useQuery<StreamStatusType>({
    queryKey: ["/api/stream/status"],
    refetchInterval: 1000,
  });

  const createStreamMutation = useMutation({
    mutationFn: async (streamData: { title: string; streamKey1: string; streamKey2: string; quality: string }) => {
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

  useEffect(() => {
    if (activeStream) {
      setCurrentStream(activeStream);
      setStreamTitle(activeStream.title || "");
      setStreamKey1(activeStream.streamKey1 || "");
      setStreamKey2(activeStream.streamKey2 || "");
      setStreamQuality(activeStream.quality || "1080p");
    }
  }, [activeStream]);

  const handleSaveSettings = () => {
    if (!streamKey1.trim() || !streamKey2.trim()) {
      toast({
        title: "Stream keys required",
        description: "Please enter both YouTube stream keys.",
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
      streamKey1,
      streamKey2,
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
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Video className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-semibold text-gray-900">Bintu Stream Buddy</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <FileUpload 
              onFileUploaded={handleFileUploaded}
              selectedFile={selectedFile}
              onRemoveFile={handleRemoveFile}
            />

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
                </div>
              </CardContent>
            </Card>

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

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Youtube className="h-5 w-5 text-red-500" />
                  <span>YouTube Live</span>
                </h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="streamKey1">Stream Key 1</Label>
                    <Input
                      id="streamKey1"
                      type={showStreamKey ? "text" : "password"}
                      placeholder="Enter your first YouTube stream key"
                      value={streamKey1}
                      onChange={(e) => setStreamKey1(e.target.value)}
                    />
                    <Label htmlFor="streamKey2">Stream Key 2</Label>
                    <Input
                      id="streamKey2"
                      type={showStreamKey ? "text" : "password"}
                      placeholder="Enter your second YouTube stream key"
                      value={streamKey2}
                      onChange={(e) => setStreamKey2(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => setShowStreamKey(!showStreamKey)}
                    >
                      {showStreamKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span className="ml-1">{showStreamKey ? "Hide Keys" : "Show Keys"}</span>
                    </Button>
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
                        <SelectItem value="1080p">1080p</SelectItem>
                        <SelectItem value="720p">720p</SelectItem>
                        <SelectItem value="480p">480p</SelectItem>
                      </SelectContent>
                    </Select>
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

            <StreamStatus
              connectionStatus={streamStatus?.connectionStatus || "disconnected"}
              uploadSpeed={streamStatus?.uploadSpeed || "0 Mbps"}
              viewerCount={streamStatus?.viewerCount || 0}
              droppedFrames={streamStatus?.droppedFrames || 0}
            />

            <ActivityLog />
          </div>
        </div>
      </div>
    </div>
  );
}