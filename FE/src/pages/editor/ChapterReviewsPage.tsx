import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card } from '../../app/components/ui/card';
import { ChapterReviewCard } from '../../app/components/ui/editor';
import {
  currentEditor,
  getChaptersNeedingReview,
  getEditorReviewByChapterId,
} from '../../data/mockData';

export default function ChapterReviewsPage() {
  usePageMeta({ title: 'Chapter Reviews' });
  const navigate = useNavigate();

  const chaptersToReview = getChaptersNeedingReview(currentEditor.id);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Chapter Reviews</h1>
        <p className="text-muted-foreground mt-1">
          {chaptersToReview.length} chapters cần review
        </p>
      </div>

      {chaptersToReview.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {chaptersToReview.map(chapter => {
            const review = getEditorReviewByChapterId(chapter.id);
            return (
              <ChapterReviewCard
                key={chapter.id}
                chapter={chapter}
                review={review}
                onReview={() => navigate(`/editor/chapters/${chapter.id}/review`)}
              />
            );
          })}
        </div>
      ) : (
        <Card>
          <div className="py-12 text-center text-muted-foreground">
            Không có chapter nào cần review
          </div>
        </Card>
      )}
    </div>
  );
}
