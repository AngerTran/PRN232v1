import { Card, CardContent, CardHeader, CardTitle } from '../card';
import { AlertCircle } from 'lucide-react';

interface FeedbackBoxProps {
  feedback: string;
  from: string;
  date?: string;
}

export function FeedbackBox({ feedback, from, date }: FeedbackBoxProps) {
  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          <CardTitle className="text-base">Yêu cầu chỉnh sửa từ {from}</CardTitle>
        </div>
        {date && (
          <p className="text-xs text-muted-foreground mt-1">{date}</p>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed">{feedback}</p>
      </CardContent>
    </Card>
  );
}
