import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Check, Gavel, X, Clock3 } from 'lucide-react';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { BoardMangaCard } from '../../app/components/ui/board/BoardMangaCard';
import { usePageMeta } from '../../hooks/usePageMeta';
import {
  getMyBoardReviewInvitations,
  respondToBoardReviewInvitation,
  getSeries,
  type SeriesBoardReviewInvitation,
} from '../../services/seriesApi';
import type { Series } from '../../types/domain';

type EnrichedInvitation = SeriesBoardReviewInvitation & { series?: Series | null };

function invitationBadge(status: string) {
  if (status === 'pending') {
    return (
      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
        Chờ phản hồi
      </span>
    );
  }
  if (status === 'accepted') {
    return (
      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
        Đã chấp nhận
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
      Đã từ chối
    </span>
  );
}

export default function BoardReviewInvitationsPage() {
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();
  const [invitations, setInvitations] = useState<EnrichedInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta({ title: 'Lời mời xét duyệt' });
    setLoading(true);
    getMyBoardReviewInvitations()
      .then(async list => {
        const enriched = await Promise.all(
          list.map(async inv => {
            const series = await getSeries(inv.seriesId).catch(() => null);
            return { ...inv, series };
          })
        );
        setInvitations(enriched);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Không thể tải lời mời.'))
      .finally(() => setLoading(false));
  }, [setPageMeta]);

  const respond = async (seriesId: string, action: 'accept' | 'reject', e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRespondingId(seriesId);
    setError(null);
    try {
      const updated = await respondToBoardReviewInvitation(seriesId, action);
      setInvitations(current =>
        current.map(item => (item.seriesId === seriesId ? { ...updated, series: item.series } : item))
      );
      navigate(`/board/submissions/${seriesId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể phản hồi lời mời.');
    } finally {
      setRespondingId(null);
    }
  };

  const pending = invitations.filter(i => i.status === 'pending');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Lời mời xét duyệt series</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Mangaka mời bạn xét duyệt trực tiếp. Chấp nhận = đồng ý duyệt; từ chối = không duyệt.
          {pending.length > 0 && ` · ${pending.length} lời mời đang chờ`}
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-muted/30 aspect-[3/5] animate-pulse" />
          ))}
        </div>
      ) : invitations.length === 0 ? (
        <EmptyState
          icon={<Gavel size={24} />}
          title="Chưa có lời mời"
          description="Lời mời từ mangaka sẽ xuất hiện tại đây. Bạn vẫn có thể xét duyệt series trên tab Duyệt Series."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {invitations.map(invitation => (
            <BoardMangaCard
              key={`${invitation.seriesId}-${invitation.boardMemberId}`}
              seriesId={invitation.seriesId}
              title={invitation.seriesTitle}
              coverUrl={invitation.series?.coverUrl}
              mangakaName={invitation.mangakaName}
              genre={invitation.series?.genre}
              synopsis={invitation.series?.synopsis}
              badge={invitationBadge(invitation.status)}
              to={
                invitation.status === 'pending'
                  ? `/board/submissions/${invitation.seriesId}`
                  : `/board/submissions/${invitation.seriesId}`
              }
              meta={
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Clock3 size={12} />
                  Mời lúc {new Date(invitation.createdAt).toLocaleDateString('vi-VN')}
                </p>
              }
              footer={
                invitation.status === 'pending' ? (
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      loading={respondingId === invitation.seriesId}
                      onClick={e => respond(invitation.seriesId, 'accept', e)}
                    >
                      <Check size={14} className="mr-1" /> Chấp nhận
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={respondingId === invitation.seriesId}
                      onClick={e => respond(invitation.seriesId, 'reject', e)}
                    >
                      <X size={14} className="mr-1" /> Từ chối
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={e => {
                      e.stopPropagation();
                      navigate(`/board/submissions/${invitation.seriesId}`);
                    }}
                  >
                    Xem hồ sơ đề xuất
                  </Button>
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
