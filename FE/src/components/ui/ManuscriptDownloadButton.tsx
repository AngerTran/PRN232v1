import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { downloadManuscriptFile } from '../../utils/manuscriptDownload';

interface ManuscriptDownloadButtonProps {
  url: string;
  fileName?: string | null;
  className?: string;
  children: ReactNode;
}

export default function ManuscriptDownloadButton({
  url,
  fileName,
  className,
  children,
}: ManuscriptDownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleClick = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadManuscriptFile(url, fileName);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể tải bản thảo.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={downloading}
      className={className}
    >
      {downloading ? 'Đang tải…' : children}
    </button>
  );
}
