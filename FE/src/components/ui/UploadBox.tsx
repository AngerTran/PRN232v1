import { useState } from 'react';
import { Upload, FileImage, X, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface UploadBoxProps {
  label?: string;
  accept?: string;
  hint?: string;
  className?: string;
  onChange?: (file: File | null) => void;
}

export default function UploadBox({ label = 'Tải lên file', accept = '*', hint, className, onChange }: UploadBoxProps) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    if (onChange) onChange(file);
  };

  const handleClear = () => {
    setFileName(null);
    if (onChange) onChange(null);
  };

  return (
    <div className={className}>
      {fileName ? (
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle size={18} className="text-green-600 shrink-0" />
          <span className="text-sm text-green-800 font-medium flex-1 truncate">{fileName}</span>
          <button type="button" onClick={handleClear} className="text-green-600 hover:text-green-800 transition-colors">
            <X size={15} />
          </button>
        </div>
      ) : (
        <label
          className={clsx(
            'flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-150',
            dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
          )}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
          }}
        >
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }}
          />
          <div className="p-2.5 bg-muted rounded-xl">
            <Upload size={20} className="text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{hint ?? 'Kéo thả hoặc nhấn để chọn'}</p>
          </div>
        </label>
      )}
    </div>
  );
}

interface MultiUploadBoxProps {
  label?: string;
  className?: string;
  onChange?: (files: File[]) => void;
}

export function MultiUploadBox({ label = 'Tải lên trang', className, onChange }: MultiUploadBoxProps) {
  const [files, setFiles] = useState<File[]>([]);

  const addFiles = (newFiles: File[]) => {
    setFiles(prev => {
      const next = [...prev, ...newFiles];
      if (onChange) onChange(next);
      return next;
    });
  };

  const removeFile = (i: number) => {
    setFiles(prev => {
      const next = prev.filter((_, idx) => idx !== i);
      if (onChange) onChange(next);
      return next;
    });
  };

  return (
    <div className={className}>
      <label
        className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 rounded-xl cursor-pointer transition-all duration-150"
      >
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = ''; }}
        />
        <FileImage size={22} className="text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">PNG, JPG, PSD — cho phép nhiều file</p>
        </div>
      </label>
      {files.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {files.map((file, i) => (
            <li key={i} className="flex items-center gap-2 px-3 py-2 bg-muted/60 rounded-lg text-sm">
              <FileImage size={14} className="text-muted-foreground shrink-0" />
              <span className="flex-1 truncate">{file.name}</span>
              <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-foreground">
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
