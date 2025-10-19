import { Card, CardContent } from "@/components/ui/card";
import { Upload, File } from "lucide-react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFilesSelected: (files: File[], tagIds: string[]) => void;
  onFilesReadyForTagging?: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
}

export function FileUpload({ onFilesSelected, onFilesReadyForTagging, accept = ".pdf,.csv", maxFiles = 10 }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).slice(0, maxFiles);
      if (onFilesReadyForTagging) {
        onFilesReadyForTagging(files);
      } else {
        onFilesSelected(files, []);
      }
    },
    [onFilesSelected, onFilesReadyForTagging, maxFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files).slice(0, maxFiles) : [];
      if (onFilesReadyForTagging) {
        onFilesReadyForTagging(files);
      } else {
        onFilesSelected(files, []);
      }
    },
    [onFilesSelected, onFilesReadyForTagging, maxFiles]
  );

  return (
    <Card
      className={cn(
        "border-2 border-dashed transition-colors cursor-pointer",
        isDragging && "border-primary bg-primary/5"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById("file-input")?.click()}
      data-testid="file-upload"
    >
      <CardContent className="flex flex-col items-center justify-center p-12 text-center">
        <Upload className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-1">Drop files here or click to upload</h3>
        <p className="text-sm text-muted-foreground mb-4">
          PDF and CSV files supported (max {maxFiles} files)
        </p>
        <input
          id="file-input"
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={handleFileInput}
          data-testid="input-file"
        />
      </CardContent>
    </Card>
  );
}
