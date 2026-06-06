import { useEffect, useState } from 'react';
import { Check, Mail, X } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import { usePageMeta } from '../../hooks/usePageMeta';
import {
  getMyAssistantInvitations,
  respondToAssistantInvitation,
  type AssistantInvitation,
} from '../../services/profilesApi';

export default function StudioInvitationsPage() {
  const { setPageMeta } = usePageMeta();
  const [invitations, setInvitations] = useState<AssistantInvitation[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta({ title: 'Lời mời studio' });
    getMyAssistantInvitations()
      .then(setInvitations)
      .catch(err => setError(err instanceof Error ? err.message : 'Không thể tải lời mời.'));
  }, []);

  const respond = async (mangakaId: string, action: 'accept' | 'reject') => {
    setRespondingId(mangakaId);
    setError(null);
    try {
      const updated = await respondToAssistantInvitation(mangakaId, action);
      setInvitations(current => current.map(item => item.mangakaId === mangakaId ? updated : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể phản hồi lời mời.');
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Lời mời studio</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Chấp nhận lời mời để mangaka có thể giao nhiệm vụ cho bạn.
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {invitations.length === 0 ? (
        <EmptyState icon={<Mail size={24} />} title="Chưa có lời mời" description="Lời mời từ mangaka sẽ xuất hiện tại đây." />
      ) : (
        <div className="grid gap-4">
          {invitations.map(invitation => (
            <Card key={invitation.mangakaId}>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-secondary text-secondary-foreground font-bold flex items-center justify-center">
                  {invitation.mangakaName.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{invitation.mangakaName}</p>
                  <p className="text-sm text-muted-foreground">{invitation.mangakaEmail}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Trạng thái: {invitation.status === 'pending' ? 'Chờ bạn xác nhận' : invitation.status === 'accepted' ? 'Đã chấp nhận' : 'Đã từ chối'}
                  </p>
                </div>
                {invitation.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={respondingId === invitation.mangakaId}
                      onClick={() => respond(invitation.mangakaId, 'reject')}
                    >
                      <X size={14} /> Từ chối
                    </Button>
                    <Button
                      size="sm"
                      loading={respondingId === invitation.mangakaId}
                      onClick={() => respond(invitation.mangakaId, 'accept')}
                    >
                      <Check size={14} /> Chấp nhận
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
