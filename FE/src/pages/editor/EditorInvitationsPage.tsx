import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Check, Mail, X } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import { usePageMeta } from '../../hooks/usePageMeta';
import {
  getMyEditorInvitations,
  respondToEditorInvitation,
  type SeriesEditorInvitation,
} from '../../services/seriesApi';

export default function EditorInvitationsPage() {
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();
  const [invitations, setInvitations] = useState<SeriesEditorInvitation[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta({ title: 'Lời mời phụ trách' });
    getMyEditorInvitations()
      .then(setInvitations)
      .catch(err => setError(err instanceof Error ? err.message : 'Không thể tải lời mời.'));
  }, []);

  const respond = async (seriesId: string, action: 'accept' | 'reject') => {
    setRespondingId(seriesId);
    setError(null);
    try {
      const updated = await respondToEditorInvitation(seriesId, action);
      setInvitations(current => current.map(item => item.seriesId === seriesId ? updated : item));
      if (action === 'accept') {
        navigate(`/editor/series/${seriesId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể phản hồi lời mời.');
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Lời mời phụ trách series</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Chấp nhận lời mời từ mangaka để bắt đầu giám sát series.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {invitations.length === 0 ? (
        <EmptyState icon={<Mail size={24} />} title="Chưa có lời mời" description="Lời mời từ mangaka sẽ xuất hiện tại đây." />
      ) : (
        <div className="grid gap-4">
          {invitations.map(invitation => (
            <Card key={`${invitation.seriesId}-${invitation.editorId}`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-secondary text-secondary-foreground font-bold flex items-center justify-center shrink-0">
                  {invitation.mangakaName.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{invitation.seriesTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    Mangaka: {invitation.mangakaName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {invitation.status === 'pending'
                      ? 'Chờ bạn xác nhận'
                      : invitation.status === 'accepted'
                      ? 'Đã chấp nhận'
                      : 'Đã từ chối'}
                  </p>
                </div>
                {invitation.status === 'pending' ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={respondingId === invitation.seriesId}
                      onClick={() => respond(invitation.seriesId, 'reject')}
                    >
                      <X size={14} /> Từ chối
                    </Button>
                    <Button
                      size="sm"
                      loading={respondingId === invitation.seriesId}
                      onClick={() => respond(invitation.seriesId, 'accept')}
                    >
                      <Check size={14} /> Chấp nhận
                    </Button>
                  </div>
                ) : invitation.status === 'accepted' ? (
                  <Button variant="outline" size="sm" onClick={() => navigate(`/editor/series/${invitation.seriesId}`)}>
                    Mở series
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
