import { useState } from 'react';
import { Upload, X, File } from 'lucide-react';
import { Button } from '../button';
import { cn } from '../utils';

interface UploadResultBoxProps {
  onFileSelect?: (file: File | null) => void;
  className?: string;
}

export function UploadResultBox({ onFileSelect, className }: UploadResultBoxProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const applyFile = (file: File | null) => {
    setSelectedFile(file);
    onFileSelect?.(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) applyFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applyFile(file);
    e.target.value = '';
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-dashed transition-colors',
        isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/30',
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {!selectedFile ? (
        <label className="flex flex-col items-center justify-center cursor-pointer px-4 py-8 sm:py-10">
          <Upload className="h-9 w-9 text-muted-foreground mb-3" />
          <p className="text-sm font-medium mb-1 text-center">Kéo thả file vào đây hoặc bấm để chọn</p>
          <p className="text-xs text-muted-foreground">PSD, PNG, JPG — tối đa 50MB</p>
          <input
            type="file"
            className="hidden"
            accept=".psd,.png,.jpg,.jpeg"
            onChange={handleFileChange}
          />
        </label>
      ) : (
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-lg bg-primary/10 p-2 shrink-0">
              <File className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="shrink-0" onClick={() => applyFile(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
