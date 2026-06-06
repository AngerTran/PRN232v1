import { useEffect, useState, type FormEvent } from 'react';
import { Clock3, Trash2, UserPlus, Users } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import { usePageMeta } from '../../hooks/usePageMeta';
import {
  addAssistant,
  getSentAssistantInvitations,
  removeAssistant,
  type AssistantInvitation,
} from '../../services/profilesApi';

const STATUS_LABELS: Record<AssistantInvitation['status'], string> = {
  pending: 'Chờ xác nhận',
  accepted: 'Đã chấp nhận',
  rejected: 'Đã từ chối',
};

export default function AssistantsPage() {
  const { setPageMeta } = usePageMeta();
  const [invitations, setInvitations] = useState<AssistantInvitation[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta({ title: 'Trợ lý' });
    getSentAssistantInvitations()
      .then(setInvitations)
      .catch(err => setError(err instanceof Error ? err.message : 'Không thể tải danh sách lời mời.'))
      .finally(() => setLoading(false));
  }, []);

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const invitation = await addAssistant(email);
      setInvitations(current => [invitation, ...current.filter(item => item.assistantId !== invitation.assistantId)]);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi lời mời.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (assistantId: string) => {
    setRemovingId(assistantId);
    setError(null);
    try {
      await removeAssistant(assistantId);
      setInvitations(current => current.filter(item => item.assistantId !== assistantId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gỡ trợ lý hoặc hủy lời mời.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Trợ lý của tôi</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Trợ lý phải chấp nhận lời mời trước khi bạn có thể giao nhiệm vụ.
        </p>
      </div>

      <Card>
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Email tài khoản assistant
            </label>
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="assistant@example.com"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            />
          </div>
          <Button type="submit" loading={submitting} className="sm:self-end">
            <UserPlus size={16} />
            Gửi lời mời
          </Button>
        </form>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Đang tải danh sách...</p>
      ) : invitations.length === 0 ? (
        <EmptyState
          icon={<Users size={24} />}
          title="Chưa có trợ lý"
          description="Gửi lời mời bằng email và chờ assistant xác nhận."
        />
      ) : (
        <Card padding="none">
          <div className="divide-y divide-border">
            {invitations.map(invitation => (
              <div key={invitation.assistantId} className="flex items-center gap-3 px-5 py-4">
                <div className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground font-bold flex items-center justify-center">
                  {invitation.assistantName.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{invitation.assistantName}</p>
                  <p className="text-sm text-muted-foreground truncate">{invitation.assistantEmail}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  invitation.status === 'accepted'
                    ? 'bg-green-100 text-green-700'
                    : invitation.status === 'pending'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {invitation.status === 'pending' && <Clock3 size={12} className="inline mr-1" />}
                  {STATUS_LABELS[invitation.status]}
                </span>
                <Button
                  variant="danger"
                  size="sm"
                  loading={removingId === invitation.assistantId}
                  onClick={() => handleRemove(invitation.assistantId)}
                >
                  <Trash2 size={14} />
                  {invitation.status === 'pending' ? 'Hủy lời mời' : 'Gỡ'}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
