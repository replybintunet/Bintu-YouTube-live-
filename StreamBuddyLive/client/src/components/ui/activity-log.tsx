import { Card, CardContent } from "./card";
import { ScrollArea } from "./scroll-area";
import { Badge } from "./badge";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface ActivityLog {
  id: number;
  action: string;
  message: string;
  level: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
}

export function ActivityLog() {
  const { data: logs = [] } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success': return 'bg-accent';
      case 'error': return 'bg-destructive';
      case 'warning': return 'bg-warning';
      case 'info': return 'bg-primary';
      default: return 'bg-gray-400';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return format(date, 'HH:mm:ss');
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Log</h2>
        
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {logs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">No activity logs yet</p>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getLevelColor(log.level)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{log.message}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-xs text-gray-500">
                        {formatTimestamp(log.timestamp)}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {log.level}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
