import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Clock3, Gavel, UserPlus } from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import { usePageMeta } from '../../hooks/usePageMeta';
import { getBoardMembers, type ProfileSummary } from '../../services/profilesApi';
import {
  getMySeries,
  getSentBoardReviewInvitations,
  inviteBoardMember,
  getSeriesBoardReviewStatus,
  REVIEW_EXPIRY_DAYS,
  type SeriesBoardReviewInvitation,
  type SeriesBoardReviewStatus,
} from '../../services/seriesApi';
import type { Series } from '../../types/domain';

export default function BoardInvitePage() {
  const { setPageMeta } = usePageMeta();
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [invitations, setInvitations] = useState<SeriesBoardReviewInvitation[]>([]);
  const [reviewStatusBySeries, setReviewStatusBySeries] = useState<Record<string, SeriesBoardReviewStatus>>({});
  const [boardMembers, setBoardMembers] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitingSeriesId, setInvitingSeriesId] = useState<string | null>(null);
  const [selectedBySeries, setSelectedBySeries] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta({ title: 'Mời hội đồng' });
    Promise.all([getMySeries(), getBoardMembers(), getSentBoardReviewInvitations()])
      .then(async ([series, members, sentInvitations]) => {
        const pending = series.filter(item => item.status === 'Submitted');
        setSeriesList(pending);
        setBoardMembers(members);
        setInvitations(sentInvitations);
        const statuses = await Promise.all(
          pending.map(async item => {
            try {
              return [item.id, await getSeriesBoardReviewStatus(item.id)] as const;
            } catch {
              return null;
            }
          })
        );
        setReviewStatusBySeries(Object.fromEntries(statuses.filter(Boolean) as [string, SeriesBoardReviewStatus][]));
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu.'))
      .finally(() => setLoading(false));
  }, [setPageMeta]);

  const handleInvite = async (seriesId: string) => {
    const boardMemberId = selectedBySeries[seriesId];
    if (!boardMemberId) return;

    setInvitingSeriesId(seriesId);
    setError(null);
    try {
      const invitation = await inviteBoardMember(seriesId, boardMemberId);
      setInvitations(current => [
        invitation,
        ...current.filter(item => !(item.seriesId === seriesId && item.boardMemberId === boardMemberId)),
      ]);
      const status = await getSeriesBoardReviewStatus(seriesId);
      setReviewStatusBySeries(current => ({ ...current, [seriesId]: status }));
      setSelectedBySeries(current => ({ ...current, [seriesId]: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi lời mời.');
    } finally {
      setInvitingSeriesId(null);
    }
  };

  const invitationsForSeries = (seriesId: string) =>
    invitations.filter(item => item.seriesId === seriesId);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Mời hội đồng xét duyệt</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tuỳ chọn mời tối đa 3 thành viên board. Series vẫn hiển thị trên tab chung để board khác tự nhận xét duyệt.
          Hết hạn sau {REVIEW_EXPIRY_DAYS} ngày kể từ khi nộp duyệt.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      ) : seriesList.length === 0 ? (
        <EmptyState
          icon={<Gavel size={24} />}
          title="Không có series chờ duyệt"
          description="Gửi series lên hội đồng từ trang chi tiết series trước khi mời board."
        />
      ) : (
        <div className="space-y-4">
          {seriesList.map(series => {
            const status = reviewStatusBySeries[series.id];
            const seriesInvites = invitationsForSeries(series.id);
            const slotsLeft = status?.availableInviteSlots ?? 3;

            return (
              <Card key={series.id}>
                <div className="flex flex-col lg:flex-row gap-5">
                  <div className="w-20 h-28 rounded-lg overflow-hidden bg-muted shrink-0">
                    {series.coverUrl && <img src={series.coverUrl} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{series.title}</h2>
                      <Badge status={series.status} />
                    </div>
                    {status && (
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={12} />
                          Vote: {status.votedBoardMembers}/{status.requiredVotes} (✓ {status.approveVotes} · ✗ {status.rejectVotes})
                        </span>
                        <span>Còn {slotsLeft} slot mời</span>
                        {status.reviewExpiresAt && (
                          <span>Hết hạn: {new Date(status.reviewExpiresAt).toLocaleDateString('vi-VN')}</span>
                        )}
                      </div>
                    )}
                    {seriesInvites.length > 0 && (
                      <ul className="text-sm space-y-1">
                        {seriesInvites.map(inv => (
                          <li key={`${inv.seriesId}-${inv.boardMemberId}`} className="text-muted-foreground">
                            {inv.boardMemberName} —{' '}
                            {inv.status === 'pending' ? 'Đang chờ' : inv.status === 'accepted' ? 'Đã chấp nhận' : 'Đã từ chối'}
                          </li>
                        ))}
                      </ul>
                    )}
                    {slotsLeft > 0 ? (
                      <div className="flex flex-col sm:flex-row gap-2 max-w-lg">
                        <select
                          className="flex-1 px-3 py-2 text-sm border border-border rounded-xl bg-background"
                          value={selectedBySeries[series.id] ?? ''}
                          onChange={e => setSelectedBySeries(c => ({ ...c, [series.id]: e.target.value }))}
                        >
                          <option value="">Chọn thành viên board...</option>
                          {boardMembers.map(member => (
                            <option key={member.id} value={member.id}>{member.name}</option>
                          ))}
                        </select>
                        <Button
                          variant="primary"
                          disabled={!selectedBySeries[series.id] || invitingSeriesId === series.id}
                          loading={invitingSeriesId === series.id}
                          onClick={() => handleInvite(series.id)}
                        >
                          <UserPlus size={16} className="mr-1.5" />
                          Gửi lời mời
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Đã đủ 3 vị trí xét duyệt đang hoạt động.</p>
                    )}
                    <Link to={`/mangaka/series/${series.id}`} className="text-xs text-primary hover:underline">
                      Xem chi tiết series
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
