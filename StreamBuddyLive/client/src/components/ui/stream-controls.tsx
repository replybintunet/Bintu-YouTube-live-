import { useState } from "react";
import { Card, CardContent } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import { Radio, Square, TestTube } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { streamApi } from "@/lib/stream-api";
import { useToast } from "@/hooks/use-toast";

interface StreamControlsProps {
  streamId?: number;
  filePath?: string;
  isStreaming: boolean;
  streamDuration: string;
  connectionStatus: string;
  loop?: boolean;
  streamMode?: 'desktop' | 'mobile';
}

export function StreamControls({ 
  streamId, 
  filePath, 
  isStreaming, 
  streamDuration,
  connectionStatus,
  loop = true,
  streamMode = 'desktop'
}: StreamControlsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const startStreamMutation = useMutation({
    mutationFn: () => {
      if (!streamId || !filePath) {
        throw new Error("Stream ID and file path are required");
      }
      return streamApi.startStream(streamId, filePath, loop, streamMode);
    },
    onSuccess: () => {
      toast({
        title: "Stream started",
        description: "Your live stream has started successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stream/status"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to start stream",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const stopStreamMutation = useMutation({
    mutationFn: () => {
      if (!streamId) {
        throw new Error("Stream ID is required");
      }
      return streamApi.stopStream(streamId);
    },
    onSuccess: () => {
      toast({
        title: "Stream stopped",
        description: "Your live stream has been stopped.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stream/status"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to stop stream",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleToggleStream = () => {
    if (isStreaming) {
      stopStreamMutation.mutate();
    } else {
      if (!streamId || !filePath) {
        toast({
          title: "Cannot start stream",
          description: "Please select a video file and configure your stream settings.",
          variant: "destructive",
        });
        return;
      }
      startStreamMutation.mutate();
    }
  };

  const isLoading = startStreamMutation.isPending || stopStreamMutation.isPending;
  const canStream = streamId && filePath && !isLoading;

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Stream Controls</h2>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleToggleStream}
              disabled={!canStream}
              className={`px-8 py-3 text-lg font-semibold flex items-center space-x-2 ${
                isStreaming 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {isStreaming ? (
                <>
                  <Square className="h-5 w-5" />
                  <span>Stop Stream</span>
                </>
              ) : (
                <>
                  <Radio className="h-5 w-5" />
                  <span>Start Stream</span>
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              className="px-6 py-3 font-medium flex items-center space-x-2"
              disabled={isLoading}
            >
              <TestTube className="h-4 w-4" />
              <span>Test</span>
            </Button>

            {isStreaming && (
              <Badge variant="default" className="bg-accent text-accent-foreground live-indicator">
                LIVE
              </Badge>
            )}
          </div>
          
          <div className="text-right">
            <p className="text-sm text-gray-500">Stream Duration</p>
            <p className="text-lg font-mono font-semibold text-gray-900">{streamDuration}</p>
          </div>
        </div>

        {connectionStatus && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Status:</span>
              <Badge 
                variant={connectionStatus === 'connected' ? 'default' : 'secondary'}
                className={connectionStatus === 'connected' ? 'bg-accent' : ''}
              >
                {connectionStatus}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
