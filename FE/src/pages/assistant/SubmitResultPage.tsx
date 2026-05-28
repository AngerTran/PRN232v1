import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Textarea } from '../../app/components/ui/textarea';
import { Separator } from '../../app/components/ui/separator';
import { UploadResultBox } from '../../app/components/ui/assistant';
import { getTaskById } from '../../data/mockData';
import { ArrowLeft, Send, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function SubmitResultPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const task = taskId ? getTaskById(taskId) : undefined;

  usePageMeta({ title: 'Nộp Kết Quả' });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [comment, setComment] = useState('');

  if (!task) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Không tìm thấy task</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/assistant/tasks')}
          >
            Quay lại danh sách
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = () => {
    if (!selectedFile) {
      toast.error('Vui lòng upload file kết quả');
      return;
    }

    // Mock submit
    toast.success('Đã nộp kết quả thành công!');
    setTimeout(() => {
      navigate(`/assistant/tasks/${task.id}`);
    }, 1000);
  };

  const handleSaveDraft = () => {
    toast.success('Đã lưu bản nháp');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate(`/assistant/tasks/${task.id}`)}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Quay lại chi tiết task
      </Button>

      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Nộp Kết Quả</CardTitle>
          <p className="text-muted-foreground mt-2">
            {task.title} - {task.seriesTitle}
          </p>
        </CardHeader>
      </Card>

      {/* Task Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Thông Tin Task</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div>
              <p className="text-muted-foreground">Series</p>
              <p className="font-medium mt-1">{task.seriesTitle}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Chapter</p>
              <p className="font-medium mt-1">{task.chapterTitle}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Trang</p>
              <p className="font-medium mt-1">#{task.pageNumber}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Loại Task</p>
              <p className="font-medium mt-1">{task.type}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload File Kết Quả</CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload file hoàn thành của bạn. Hỗ trợ định dạng PSD, PNG, JPG.
          </p>
        </CardHeader>
        <CardContent>
          <UploadResultBox onFileSelect={setSelectedFile} />
        </CardContent>
      </Card>

      {/* Preview Section */}
      {selectedFile && (
        <Card>
          <CardHeader>
            <CardTitle>Preview File</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">Preview: {selectedFile.name}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comment Section */}
      <Card>
        <CardHeader>
          <CardTitle>Ghi Chú cho Mangaka</CardTitle>
          <p className="text-sm text-muted-foreground">
            Thêm ghi chú hoặc giải thích về công việc của bạn (tuỳ chọn)
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Ví dụ: Đã hoàn thành background với lighting từ góc trái như yêu cầu. Sử dụng screentone 60L cho shadows..."
            rows={5}
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={handleSaveDraft}
            >
              <Save className="h-5 w-5 mr-2" />
              Lưu Bản Nháp
            </Button>
            <Button
              size="lg"
              className="flex-1"
              onClick={handleSubmit}
            >
              <Send className="h-5 w-5 mr-2" />
              Nộp Cho Mangaka
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
