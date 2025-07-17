import { useEffect, useState } from "react";
import { Card, CardContent } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import { Radio, Square, TestTube } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { streamApi, StreamStatus } from "@/lib/stream-api";
import { useToast } from "@/hooks/use-toast";

interface StreamControlsProps {
  streamId: number;
  filePath: string;
  isStreaming: boolean;
  streamMode?: "desktop" | "mobile";
  loop?: boolean;
}

export function StreamControls({
  streamId,
  filePath,
  isStreaming,
  streamMode = "desktop",
  loop = true,
}: StreamControlsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null);

  const { data, refetch } = useQuery({
    queryKey: ["streamStatus", streamId],
    queryFn: () => streamApi.getStreamStatus(streamId),
    enabled: false,
    refetchInterval: 5000,
    onSuccess: setStreamStatus,
  });

  useEffect(() => {
    refetch();
  }, [streamId]);

  const startStreamMutation = useMutation({
    mutationFn: () =>
      streamApi.startStream(streamId, filePath, loop, streamMode),
    onSuccess: () => {
      toast({
        title: "Stream started",
        description: "Your live stream has started successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["streamStatus", streamId] });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Failed to start stream",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const stopStreamMutation = useMutation({
    mutationFn: () => streamApi.stopStream(streamId),
    onSuccess: () => {
      toast({
        title: "Stream stopped",
        description: "Your live stream has been stopped.",
      });
      queryClient.invalidateQueries({ queryKey: ["streamStatus", streamId] });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Failed to stop stream",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const testStreamKey = async () => {
    try {
      const result = await streamApi.testStreamKey(streamStatus?.connectionStatus || "");
      toast({
        title: "Stream Key Test",
        description: result.message || "Stream key test completed.",
      });
    } catch (error) {
      toast({
        title: "Stream Key Test Failed",
        description:
          error instanceof Error ? error.message : "Failed to test stream key",
        variant: "destructive",
      });
    }
  };

  const handleToggleStream = () => {
    if (isStreaming) {
      stopStreamMutation.mutate();
    } else {
      startStreamMutation.mutate();
    }
  };

  const isLoading =
    startStreamMutation.isPending || stopStreamMutation.isPending;

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Stream Controls (ID: {streamId})
        </h2>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleToggleStream}
              disabled={isLoading}
              className={`px-8 py-3 text-lg font-semibold flex items-center space-x-2 ${
                isStreaming
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
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
              onClick={testStreamKey}
            >
              <TestTube className="h-4 w-4" />
              <span>Test Key</span>
            </Button>

            {isStreaming && (
              <Badge variant="default" className="bg-accent text-accent-foreground live-indicator">
                LIVE
              </Badge>
            )}
          </div>

          <div className="text-right">
            <p className="text-sm text-gray-500">Duration</p>
            <p className="text-lg font-mono font-semibold text-gray-900">
              {streamStatus?.duration || "00:00:00"}
            </p>
          </div>
        </div>

        {streamStatus && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Status:</span>
              <span>{streamStatus.connectionStatus}</span>
            </div>
            <div className="flex justify-between">
              <span>Upload Speed:</span>
              <span>{streamStatus.uploadSpeed}</span>
            </div>
            <div className="flex justify-between">
              <span>Dropped Frames:</span>
              <span>{streamStatus.droppedFrames}</span>
            </div>
            <div className="flex justify-between">
              <span>Viewers:</span>
              <span>{streamStatus.viewerCount}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}