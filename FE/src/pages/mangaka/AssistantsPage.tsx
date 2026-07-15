import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, Clock3, Mail, Search, Trash2, UserPlus, Users } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import { usePageMeta } from '../../hooks/usePageMeta';
import {
  addAssistant,
  getAssistantDirectory,
  getSentAssistantInvitations,
  removeAssistant,
  type AssistantInvitation,
  type ProfileSummary,
} from '../../services/profilesApi';

const STATUS_LABELS: Record<AssistantInvitation['status'], string> = {
  pending: 'Chờ xác nhận',
  accepted: 'Đã chấp nhận',
  rejected: 'Đã từ chối',
};

export default function AssistantsPage() {
  const { setPageMeta } = usePageMeta();
  const [invitations, setInvitations] = useState<AssistantInvitation[]>([]);
  const [directory, setDirectory] = useState<ProfileSummary[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [email, setEmail] = useState('');
  const [search, setSearch] = useState('');
  const [inviteMode, setInviteMode] = useState<'pick' | 'email'>('pick');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta({ title: 'Trợ lý' });
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [invites, dir] = await Promise.all([
          getSentAssistantInvitations(),
          getAssistantDirectory(),
        ]);
        if (!active) return;
        setInvitations(invites);
        setDirectory(dir);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách trợ lý.');
        // Vẫn cố lấy invitation / directory riêng để một API hỏng không làm trống hết trang.
        const [invites, dir] = await Promise.all([
          getSentAssistantInvitations().catch(() => [] as AssistantInvitation[]),
          getAssistantDirectory().catch(() => [] as ProfileSummary[]),
        ]);
        if (!active) return;
        setInvitations(invites);
        setDirectory(dir);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [setPageMeta]);

  const linkedIds = useMemo(
    () => new Set(invitations.filter(i => i.status === 'accepted' || i.status === 'pending').map(i => i.assistantId)),
    [invitations],
  );

  const availableToInvite = useMemo(() => {
    const q = search.trim().toLowerCase();
    return directory
      .filter(a => !linkedIds.has(a.id))
      .filter(a => !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
  }, [directory, linkedIds, search]);

  const accepted = invitations.filter(i => i.status === 'accepted');
  const pending = invitations.filter(i => i.status === 'pending');
  const rejected = invitations.filter(i => i.status === 'rejected');

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const invitation = inviteMode === 'pick'
        ? await addAssistant({ assistantId: selectedId })
        : await addAssistant({ email });
      setInvitations(current => [invitation, ...current.filter(item => item.assistantId !== invitation.assistantId)]);
      setSelectedId('');
      setEmail('');
      setSuccess(`Đã gửi lời mời tới ${invitation.assistantName}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi lời mời.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (assistantId: string) => {
    setRemovingId(assistantId);
    setError(null);
    setSuccess(null);
    try {
      await removeAssistant(assistantId);
      setInvitations(current => current.filter(item => item.assistantId !== assistantId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gỡ trợ lý hoặc hủy lời mời.');
    } finally {
      setRemovingId(null);
    }
  };

  const canSubmit = inviteMode === 'pick' ? Boolean(selectedId) : Boolean(email.trim());

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">Trợ lý của tôi</h1>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          Chọn trợ lý có sẵn trong hệ thống hoặc mời bằng email. Họ cần chấp nhận trước khi bạn giao nhiệm vụ.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card shadow-sm px-5 py-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { setInviteMode('pick'); setError(null); }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors ${
              inviteMode === 'pick'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            Chọn từ danh sách
          </button>
          <button
            type="button"
            onClick={() => { setInviteMode('email'); setError(null); }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors ${
              inviteMode === 'email'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            Mời bằng email
          </button>
        </div>

        <form onSubmit={handleInvite} className="space-y-3">
          {inviteMode === 'pick' ? (
            <div className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Trợ lý khả dụng
                  {!loading && (
                    <span className="ml-1 text-muted-foreground/80">
                      ({availableToInvite.length}/{directory.length})
                    </span>
                  )}
                </span>
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Tìm theo tên hoặc email..."
                    className="w-full rounded-xl border border-border bg-background pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </label>

              <div className="rounded-xl border border-border max-h-64 overflow-y-auto divide-y divide-border bg-background">
                {loading ? (
                  <p className="px-4 py-6 text-sm text-muted-foreground text-center">Đang tải trợ lý...</p>
                ) : availableToInvite.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted-foreground text-center leading-relaxed">
                    {directory.length === 0
                      ? 'Không tải được danh sách trợ lý. Thử «Mời bằng email» hoặc kiểm tra backend.'
                      : search.trim()
                        ? 'Không khớp kết quả tìm kiếm.'
                        : 'Không còn trợ lý để mời (đã liên kết hết).'}
                  </p>
                ) : (
                  availableToInvite.map(a => {
                    const selected = selectedId === a.id;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setSelectedId(a.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          selected ? 'bg-primary/10' : 'hover:bg-muted/60'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-secondary text-secondary-foreground text-sm font-bold flex items-center justify-center shrink-0">
                          {(a.name || a.email).slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{a.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{a.email}</p>
                        </div>
                        {selected && <Check size={16} className="text-primary shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Email tài khoản Assistant</span>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="assistant@example.com"
                  className="w-full rounded-xl border border-border bg-background pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Email phải thuộc tài khoản role Assistant đã có trong hệ thống.
              </p>
            </label>
          )}

          <Button type="submit" loading={submitting} disabled={!canSubmit} className="w-full sm:w-auto">
            <UserPlus size={16} />
            Gửi lời mời
          </Button>
        </form>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-800">
            {success}
          </div>
        )}
      </section>

      {loading ? (
        <p className="text-sm text-muted-foreground">Đang tải danh sách...</p>
      ) : invitations.length === 0 ? (
        <EmptyState
          icon={<Users size={24} />}
          title="Chưa có trợ lý"
          description="Chọn người từ danh sách hoặc mời bằng email, rồi chờ họ chấp nhận."
        />
      ) : (
        <div className="space-y-5">
          {accepted.length > 0 && (
            <InvitationGroup
              title={`Đang trong studio (${accepted.length})`}
              items={accepted}
              removingId={removingId}
              onRemove={handleRemove}
            />
          )}
          {pending.length > 0 && (
            <InvitationGroup
              title={`Chờ xác nhận (${pending.length})`}
              items={pending}
              removingId={removingId}
              onRemove={handleRemove}
            />
          )}
          {rejected.length > 0 && (
            <InvitationGroup
              title={`Đã từ chối (${rejected.length})`}
              items={rejected}
              removingId={removingId}
              onRemove={handleRemove}
            />
          )}
        </div>
      )}
    </div>
  );
}

function InvitationGroup({
  title,
  items,
  removingId,
  onRemove,
}: {
  title: string;
  items: AssistantInvitation[];
  removingId: string | null;
  onRemove: (id: string) => void;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground px-1">{title}</h2>
      <Card padding="none">
        <div className="divide-y divide-border">
          {items.map(invitation => (
            <div key={invitation.assistantId} className="flex items-center gap-3 px-5 py-4">
              <div className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground font-bold flex items-center justify-center shrink-0">
                {invitation.assistantName.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{invitation.assistantName}</p>
                <p className="text-sm text-muted-foreground truncate">{invitation.assistantEmail}</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
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
                onClick={() => onRemove(invitation.assistantId)}
              >
                <Trash2 size={14} />
                {invitation.status === 'pending' ? 'Hủy' : 'Gỡ'}
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
