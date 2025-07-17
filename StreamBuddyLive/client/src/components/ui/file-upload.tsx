import { useState, useRef } from "react";
import { Card, CardContent } from "./card";
import { Button } from "./button";
import { Progress } from "./progress";
import { X, Upload, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { streamApi } from "@/lib/stream-api";

interface FileUploadProps {
  onFileUploaded: (file: { filename: string; path: string; size: number }) => void;
  selectedFile?: { filename: string; path: string; size: number } | null;
  onRemoveFile: () => void;
}

export function FileUpload({ onFileUploaded, selectedFile, onRemoveFile }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (file: File) => {
    if (!file.type.includes('mp4') && !file.name.toLowerCase().endsWith('.mp4')) {
      toast({
        title: "Invalid file type",
        description: "Please select an MP4 video file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 1024 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a video file smaller than 1GB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const result = await streamApi.uploadFile(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        onFileUploaded(result.file);
        setIsUploading(false);
        setUploadProgress(0);
        toast({
          title: "Upload successful",
          description: "Your video file has been uploaded successfully.",
        });
      }, 500);
    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file.",
        variant: "destructive",
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Video Source</h2>
        
        {!selectedFile && !isUploading && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging 
                ? 'border-primary bg-blue-50' 
                : 'border-gray-300 hover:border-primary'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">Drop your MP4 file here</p>
            <p className="text-sm text-gray-500 mb-2">or click to browse files (up to 1GB)</p>
            <p className="text-xs text-orange-600 mb-4">Note: File will be deleted after streaming stops</p>
            <Button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-primary hover:bg-blue-700"
            >
              Select Video File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,video/mp4"
              className="hidden"
              onChange={handleFileInputChange}
            />
          </div>
        )}

        {isUploading && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Video className="h-6 w-6 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Uploading video...</p>
                <Progress value={uploadProgress} className="mt-2" />
                <p className="text-sm text-gray-500 mt-1">{uploadProgress}% complete</p>
              </div>
            </div>
          </div>
        )}

        {selectedFile && !isUploading && (
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <Video className="h-6 w-6 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{selectedFile.filename}</p>
              <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemoveFile}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
