import { useEffect, useState } from 'react';
import { Camera, BookOpen, FileText, Star, Award } from 'lucide-react';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import type { Series, User } from '../../data/mockData';
import { getMe, getStoredUser, updateMyProfile } from '../../services/authApi';
import { getMySeries } from '../../services/seriesApi';
import { usePageMeta } from '../../hooks/usePageMeta';
import { format } from 'date-fns';

const ROLE_LABEL: Record<User['role'], string> = {
  mangaka: 'Mangaka',
  assistant: 'Trợ lý',
  editor: 'Biên tập viên',
  board: 'Hội đồng',
  admin: 'Quản trị viên',
};

export default function ProfilePage() {
  const { setPageMeta } = usePageMeta();
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [series, setSeries] = useState<Series[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setPageMeta({ title: 'Hồ sơ' }); }, [setPageMeta]);

  useEffect(() => {
    let isActive = true;
    getMe()
      .then(me => {
        if (!isActive) return;
        setUser(me);
        setName(me.name);
        setBio(me.bio);
        if (me.role === 'mangaka') {
          getMySeries()
            .then(list => {
              if (isActive) setSeries(list);
            })
            .catch(() => {
              if (isActive) setSeries([]);
            });
        }
      })
      .catch(() => {
        /* giữ user từ session nếu /me lỗi */
      });
    return () => {
      isActive = false;
    };
  }, []);

  const publishedSeries = series.filter(
    s => s.status === 'Published' || s.status === 'In Progress' || s.status === 'Approved'
  );
  const totalChapters = series.reduce((sum, s) => sum + (s.chaptersCount ?? 0), 0);
  const bestRank = series.filter(s => s.currentRank > 0).map(s => s.currentRank).sort((a, b) => a - b)[0];

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await updateMyProfile({ fullName: name, bio });
      setUser(updated);
      setName(updated.name);
      setBio(updated.bio);
      setEditMode(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu hồ sơ.');
    } finally {
      setSaving(false);
    }
  };

  const isMangaka = user?.role === 'mangaka';

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold">Hồ sơ</h1>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Profile header */}
      <Card className="overflow-hidden" padding="none">
        <div className="h-24 bg-gradient-to-r from-secondary to-secondary/60" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl border-4 border-card overflow-hidden bg-secondary">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">
                    {(user?.name ?? '?').slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white border-2 border-card">
                <Camera size={12} />
              </button>
            </div>
            <Button
              variant={editMode ? 'primary' : 'outline'}
              size="sm"
              disabled={saving}
              onClick={editMode ? handleSave : () => setEditMode(true)}
            >
              {saved ? '✓ Đã lưu' : saving ? 'Đang lưu…' : editMode ? 'Lưu thay đổi' : 'Chỉnh sửa hồ sơ'}
            </Button>
          </div>

          {editMode ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Tên</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Tiểu sử</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4}
                  className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-ring/30" />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-bold">{user?.name}</h2>
                {user && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-secondary/10 text-secondary border border-secondary/30 rounded-full uppercase tracking-wide">
                    {ROLE_LABEL[user.role]}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{user?.bio || 'Chưa có tiểu sử.'}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {user?.joinDate && <span>Tham gia {format(new Date(user.joinDate), 'MMMM yyyy')}</span>}
                {user?.email && (
                  <>
                    <span className="mx-2">·</span>
                    <span>{user.email}</span>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Mangaka stats + series */}
      {isMangaka && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <BookOpen size={18} />, label: 'Series đang hoạt động', value: String(publishedSeries.length) },
              { icon: <FileText size={18} />, label: 'Tổng số chương', value: String(totalChapters) },
              { icon: <Star size={18} />, label: 'Xếp hạng cao nhất', value: bestRank ? `#${bestRank}` : '—' },
              { icon: <Award size={18} />, label: 'Tổng số series', value: String(series.length) },
            ].map(stat => (
              <Card key={stat.label} className="text-center">
                <div className="text-muted-foreground mb-2 flex justify-center">{stat.icon}</div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Series đang hoạt động</CardTitle>
            </CardHeader>
            {publishedSeries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Chưa có series đang hoạt động.</p>
            ) : (
              <div className="space-y-3">
                {publishedSeries.map(s => (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="w-10 h-14 rounded-lg overflow-hidden shrink-0 bg-muted">
                      <img src={s.coverUrl} alt={s.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.genre}</p>
                    </div>
                    <Badge status={s.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
