import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { Shield } from 'lucide-react';

export default function SeriesDefensePage() {
  usePageMeta({ title: 'Series Defense' });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Series Defense</h1>
          <p className="text-muted-foreground">
            Chuẩn bị dữ liệu để bảo vệ series trước hội đồng biên tập
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tính năng đang phát triển</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Trang này sẽ cung cấp công cụ để editor chuẩn bị dữ liệu và lập luận
            bảo vệ series đang At Risk trước hội đồng biên tập.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
