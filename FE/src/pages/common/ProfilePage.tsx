import { useState } from 'react';
import { Camera, BookOpen, FileText, Star, Award } from 'lucide-react';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { currentUser, series } from '../../data/mockData';
import { format } from 'date-fns';

export default function ProfilePage() {
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(currentUser.name);
  const [bio, setBio] = useState(currentUser.bio);
  const [saved, setSaved] = useState(false);

  const publishedSeries = series.filter(s => s.status === 'Published' || s.status === 'In Progress' || s.status === 'Approved');

  const handleSave = () => {
    setSaved(true);
    setEditMode(false);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <h1 className="text-xl font-bold">Hồ sơ</h1>

      {/* Profile header */}
      <Card className="overflow-hidden" padding="none">
        <div className="h-24 bg-gradient-to-r from-secondary to-secondary/60" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl border-4 border-card overflow-hidden bg-secondary">
                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
              </div>
              <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white border-2 border-card">
                <Camera size={12} />
              </button>
            </div>
            <Button
              variant={editMode ? 'primary' : 'outline'}
              size="sm"
              onClick={editMode ? handleSave : () => setEditMode(true)}
            >
              {saved ? '✓ Đã lưu' : editMode ? 'Lưu thay đổi' : 'Chỉnh sửa hồ sơ'}
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
                <h2 className="text-xl font-bold">{name}</h2>
                <span className="px-2 py-0.5 text-xs font-semibold bg-secondary/10 text-secondary border border-secondary/30 rounded-full uppercase tracking-wide">Mangaka</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{bio}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>Tham gia {format(new Date(currentUser.joinDate), 'MMMM yyyy')}</span>
                <span className="mx-2">·</span>
                <span>{currentUser.email}</span>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: <BookOpen size={18} />, label: 'Series đang hoạt động', value: '3' },
          { icon: <FileText size={18} />, label: 'Tổng số chương', value: '10' },
          { icon: <Star size={18} />, label: 'Xếp hạng cao nhất', value: '#3' },
          { icon: <Award size={18} />, label: 'Đã xuất bản', value: '3' },
        ].map(stat => (
          <Card key={stat.label} className="text-center">
            <div className="text-muted-foreground mb-2 flex justify-center">{stat.icon}</div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Active series */}
      <Card>
        <CardHeader>
          <CardTitle>Series đang hoạt động</CardTitle>
        </CardHeader>
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
      </Card>
    </div>
  );
}
