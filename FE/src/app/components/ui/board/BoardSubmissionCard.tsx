import { useNavigate } from 'react-router';
import { BookOpen, User, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import { SubmissionStatusBadge } from './BoardStatusBadge';
import type { Series } from '../../../../types/domain';
import type { PendingSeriesItem } from '../../../../services/boardApi';
import { BOARD_VOTES_REQUIRED, BOARD_CLAIMS_REQUIRED } from '../../../../services/boardApi';

interface BoardSubmissionCardProps {
  item: PendingSeriesItem;
  series?: Series | null;
  compact?: boolean;
}

export function BoardSubmissionCard({ item, series, compact = false }: BoardSubmissionCardProps) {
  const navigate = useNavigate();
  const coverUrl = series?.coverUrl;
  const genre = series?.genre ?? '—';
  const synopsis = series?.synopsis?.trim();
  const authorName = item.authorName ?? series?.mangakaName ?? '—';
  const requiredVotes = BOARD_VOTES_REQUIRED;
  const requiredClaims = item.requiredClaims ?? BOARD_CLAIMS_REQUIRED;
  const claimProgress = Math.min(100, Math.round((item.claimedBoardMembers / requiredClaims) * 100));
  const voteProgress = Math.min(100, Math.round((item.votedBoardMembers / requiredVotes) * 100));

  const goToDetail = () => navigate(`/board/submissions/${item.id}`);

  if (compact) {
    return (
      <article
        role="button"
        tabIndex={0}
        onClick={goToDetail}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            goToDetail();
          }
        }}
        className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <div className="flex gap-3 p-3">
          <div className="relative w-12 h-16 shrink-0 rounded-md overflow-hidden bg-muted">
            {coverUrl ? (
              <img src={coverUrl} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground text-center px-0.5">
                N/A
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2 mb-0.5">
              <h3 className="font-semibold text-sm leading-tight truncate">{item.title}</h3>
              <span className="shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 whitespace-nowrap">
                Chờ duyệt
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{authorName}</p>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{genre}</p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Reviewer</span>
                <span className="font-semibold text-foreground">
                  {item.claimedBoardMembers}/{requiredClaims}
                </span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-secondary rounded-full" style={{ width: `${claimProgress}%` }} />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Vote</span>
                <span className="font-semibold text-foreground">
                  {item.votedBoardMembers}/{requiredVotes}
                </span>
                <span className="inline-flex items-center gap-0.5 text-green-700">
                  <CheckCircle2 size={10} /> {item.approveVotes}
                </span>
                <span className="inline-flex items-center gap-0.5 text-red-600">
                  <XCircle size={10} /> {item.rejectVotes}
                </span>
              </div>
            </div>
            {item.canClaim && (
              <p className="text-[10px] font-medium text-primary mt-1">Có thể nhận xét duyệt</p>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={goToDetail}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goToDetail();
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
            <span className="text-muted-foreground font-medium">Reviewer đã nhận</span>
            <span className="font-semibold text-foreground">
              {item.claimedBoardMembers}/{requiredClaims}
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-secondary rounded-full transition-all"
              style={{ width: `${claimProgress}%` }}
            />
          </div>
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
          {item.hasLead && (
            <p className="text-xs text-muted-foreground">
              Phụ trách: <span className="font-medium text-foreground">{item.leadBoardMemberName ?? '—'}</span>
              {item.currentUserIsLead && <span className="text-primary"> · bạn</span>}
            </p>
          )}
          {item.canClaim && (
            <p className="text-xs font-medium text-primary">Có thể nhận xét duyệt</p>
          )}
          {item.currentUserHasClaimed && !item.currentUserHasVoted && (
            <p className="text-xs font-medium text-amber-700">Bạn đã nhận — hãy bỏ phiếu</p>
          )}
          {item.currentUserHasVoted && (
            <p className="text-xs text-muted-foreground">Bạn đã bỏ phiếu</p>
          )}
        </div>
      </div>
    </article>
  );
}
