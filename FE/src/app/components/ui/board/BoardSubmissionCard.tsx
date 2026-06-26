import { useNavigate } from 'react-router';
import { BookOpen, User, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import { SubmissionStatusBadge } from './BoardStatusBadge';
import type { Series } from '../../../../types/domain';
import type { PendingSeriesItem } from '../../../../services/boardApi';
import { BOARD_VOTES_REQUIRED } from '../../../../services/boardApi';

interface BoardSubmissionCardProps {
  item: PendingSeriesItem;
  series?: Series | null;
}

export function BoardSubmissionCard({ item, series }: BoardSubmissionCardProps) {
  const navigate = useNavigate();
  const coverUrl = series?.coverUrl;
  const genre = series?.genre ?? '—';
  const synopsis = series?.synopsis?.trim();
  const requiredVotes = BOARD_VOTES_REQUIRED;
  const voteProgress = Math.min(100, Math.round((item.votedBoardMembers / requiredVotes) * 100));

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/board/submissions/${item.id}`)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/board/submissions/${item.id}`);
        }
      }}
      className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      <div className="relative aspect-[3/4] bg-muted overflow-hidden">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            Chưa có ảnh bìa
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="absolute top-3 left-3">
          <SubmissionStatusBadge status="Pending Review" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="font-bold text-lg leading-tight line-clamp-2 mb-1">{item.title}</h3>
          <div className="flex items-center gap-1.5 text-xs text-white/85">
            <User size={12} />
            <span className="truncate">{item.authorName ?? series?.mangakaName ?? '—'}</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-xs text-muted-foreground line-clamp-1">{genre}</p>
        {synopsis && (
          <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed">{synopsis}</p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <BookOpen size={12} />
            <span>{series?.publishingType ?? '—'}</span>
          </div>
          <span>{series?.targetAudience ?? '—'}</span>
        </div>

        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Tiến độ vote hội đồng</span>
            <span className="font-semibold text-foreground">
              {item.votedBoardMembers}/{requiredVotes}
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${voteProgress}%` }}
            />
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="inline-flex items-center gap-1 text-green-700">
              <CheckCircle2 size={13} /> {item.approveVotes}
            </span>
            <span className="inline-flex items-center gap-1 text-red-600">
              <XCircle size={13} /> {item.rejectVotes}
            </span>
          </div>
          {item.reviewExpiresAt && (
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Clock3 size={12} />
              Hết hạn {new Date(item.reviewExpiresAt).toLocaleDateString('vi-VN')}
            </p>
          )}
          {item.canVolunteerReview && (
            <p className="text-xs font-medium text-primary">Có thể nhận xét duyệt</p>
          )}
          {item.currentUserHasVoted && (
            <p className="text-xs text-muted-foreground">Bạn đã bỏ phiếu</p>
          )}
        </div>
      </div>
    </article>
  );
}
