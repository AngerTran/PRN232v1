import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Clock3, ShieldCheck, UserPlus } from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import { usePageMeta } from '../../hooks/usePageMeta';
import { getEditors, type ProfileSummary } from '../../services/profilesApi';
import {
  canMangakaProduceOnSeries,
  getMySeries,
  getSentEditorInvitations,
  inviteSeriesEditor,
  type SeriesEditorInvitation,
} from '../../services/seriesApi';
import type { Series } from '../../types/domain';

export default function EditorsPage() {
  const { setPageMeta } = usePageMeta();
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [invitations, setInvitations] = useState<SeriesEditorInvitation[]>([]);
  const [editors, setEditors] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitingSeriesId, setInvitingSeriesId] = useState<string | null>(null);
  const [selectedBySeries, setSelectedBySeries] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta({ title: 'Editor' });
    Promise.all([getMySeries(), getEditors(), getSentEditorInvitations()])
      .then(([series, editorProfiles, sentInvitations]) => {
        setSeriesList(series.filter(item => canMangakaProduceOnSeries(item.status) || item.status === 'Completed'));
        setEditors(editorProfiles);
        setInvitations(sentInvitations);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu.'))
      .finally(() => setLoading(false));
  }, []);

  const handleInvite = async (seriesId: string) => {
    const editorId = selectedBySeries[seriesId];
    if (!editorId) return;

    setInvitingSeriesId(seriesId);
    setError(null);
    try {
      const invitation = await inviteSeriesEditor(seriesId, editorId);
      setInvitations(current => [invitation, ...current.filter(item => item.seriesId !== seriesId)]);
      setSelectedBySeries(current => ({ ...current, [seriesId]: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi lời mời.');
    } finally {
      setInvitingSeriesId(null);
    }
  };

  const pendingInvitations = invitations.filter(item => item.status === 'pending');
  const assigned = seriesList.filter(series => series.editorId);
  const needsInvite = seriesList.filter(
    series => !series.editorId && !pendingInvitations.some(item => item.seriesId === series.id)
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Editor phụ trách</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gửi lời mời editor theo từng series. Editor phải chấp nhận trước khi phụ trách chính thức.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      ) : seriesList.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck size={24} />}
          title="Chưa có series để mời editor"
          description="Series phải được hội đồng duyệt trước khi bạn có thể mời editor phụ trách."
          action={
            <Link to="/mangaka/series" className="text-sm font-semibold text-primary hover:underline">
              Xem series của tôi
            </Link>
          }
        />
      ) : (
        <>
          {pendingInvitations.length > 0 && (
            <Card padding="none">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-semibold">Chờ editor xác nhận ({pendingInvitations.length})</h2>
              </div>
              <div className="divide-y divide-border">
                {pendingInvitations.map(invitation => (
                  <div key={`${invitation.seriesId}-${invitation.editorId}`} className="flex items-center gap-3 px-5 py-4">
                    <Clock3 size={18} className="text-amber-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{invitation.seriesTitle}</p>
                      <p className="text-sm text-muted-foreground">Đã mời: {invitation.editorName}</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                      Chờ xác nhận
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {needsInvite.length > 0 && (
            <Card>
              <h2 className="font-semibold mb-1">Series chưa có editor ({needsInvite.length})</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Chọn editor và gửi lời mời phụ trách.
              </p>
              {editors.length === 0 ? (
                <p className="text-sm text-muted-foreground">Không có editor khả dụng trong hệ thống.</p>
              ) : (
                <div className="space-y-3">
                  {needsInvite.map(series => (
                    <div
                      key={series.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-border bg-muted/20"
                    >
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/mangaka/series/${series.id}`}
                          className="font-semibold hover:text-primary transition-colors"
                        >
                          {series.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge status={series.status} size="sm" />
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:w-auto w-full">
                        <select
                          className="flex-1 sm:min-w-[200px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
                          value={selectedBySeries[series.id] ?? ''}
                          onChange={event =>
                            setSelectedBySeries(current => ({
                              ...current,
                              [series.id]: event.target.value,
                            }))
                          }
                        >
                          <option value="">Chọn editor...</option>
                          {editors.map(editor => (
                            <option key={editor.id} value={editor.id}>
                              {editor.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          loading={invitingSeriesId === series.id}
                          disabled={!selectedBySeries[series.id]}
                          onClick={() => handleInvite(series.id)}
                        >
                          <UserPlus size={14} /> Gửi lời mời
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {assigned.length > 0 && (
            <Card padding="none">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-semibold">Đã có editor phụ trách ({assigned.length})</h2>
              </div>
              <div className="divide-y divide-border">
                {assigned.map(series => (
                  <div key={series.id} className="flex items-center gap-3 px-5 py-4">
                    <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center">
                      {(series.editorName ?? 'E').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/mangaka/series/${series.id}`}
                        className="font-semibold hover:text-primary transition-colors"
                      >
                        {series.title}
                      </Link>
                      <p className="text-sm text-muted-foreground truncate">
                        Editor: {series.editorName ?? '—'}
                      </p>
                    </div>
                    <Badge status={series.status} size="sm" />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
