import { Card, CardContent } from "./card";
import { Badge } from "./badge";
import { Users, Wifi, TrendingUp, AlertTriangle } from "lucide-react";

interface StreamStatusProps {
  connectionStatus: string;
  uploadSpeed: string;
  viewerCount: number;
  droppedFrames: number;
}

export function StreamStatus({ 
  connectionStatus, 
  uploadSpeed, 
  viewerCount, 
  droppedFrames 
}: StreamStatusProps) {
  const getConnectionColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-accent';
      case 'connecting': return 'bg-warning';
      case 'disconnected': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Stream Status</h2>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 flex items-center space-x-2">
              <Wifi className="h-4 w-4" />
              <span>Connection</span>
            </span>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${getConnectionColor(connectionStatus)}`} />
              <span className="text-sm font-medium text-gray-700">
                {getStatusText(connectionStatus)}
              </span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Upload Speed</span>
            </span>
            <span className="text-sm font-medium text-gray-700">{uploadSpeed}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Viewers</span>
            </span>
            <span className="text-sm font-medium text-gray-700">{viewerCount}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Dropped Frames</span>
            </span>
            <span className="text-sm font-medium text-gray-700">
              {droppedFrames} (0%)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
