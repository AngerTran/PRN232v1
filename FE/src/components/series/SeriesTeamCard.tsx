import { Crown, PenLine, User, Users, Wand2 } from 'lucide-react';
import Card, { CardHeader, CardTitle } from '../ui/Card';
import type { SeriesTeam, SeriesTeamMember, SeriesTeamRole } from '../../services/seriesApi';

const ROLE_META: Record<
  SeriesTeamRole,
  { label: string; badgeClass: string; icon: typeof User }
> = {
  mangaka: {
    label: 'Mangaka',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: PenLine,
  },
  editor: {
    label: 'Editor',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: User,
  },
  board_lead: {
    label: 'Board Lead',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: Crown,
  },
  board: {
    label: 'Board',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
    icon: Users,
  },
  assistant: {
    label: 'Trợ lí',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: Wand2,
  },
};

function MemberRow({ member }: { member: SeriesTeamMember }) {
  const meta = ROLE_META[member.role] ?? ROLE_META.board;
  const Icon = meta.icon;
  return (
    <li className="flex items-center justify-between gap-3 text-sm py-1.5 border-b border-border/60 last:border-0">
      <span className="flex items-center gap-2 min-w-0">
        <Icon size={14} className="shrink-0 text-muted-foreground" />
        <span className="font-medium truncate">{member.name}</span>
      </span>
      <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${meta.badgeClass}`}>
        {meta.label}
      </span>
    </li>
  );
}

interface SeriesTeamCardProps {
  team: SeriesTeam | null;
  loading?: boolean;
  className?: string;
}

export default function SeriesTeamCard({ team, loading, className }: SeriesTeamCardProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Đội ngũ series</CardTitle>
        </CardHeader>
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      </Card>
    );
  }

  if (!team) return null;

  const boardSlots = [...team.boardReviewers];
  while (boardSlots.length < 3) {
    boardSlots.push({
      id: `empty-board-${boardSlots.length}`,
      name: 'Chưa có',
      role: 'board',
    });
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Đội ngũ series</CardTitle>
      </CardHeader>
      <div className="space-y-4">
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Sáng tạo</p>
          <ul>
            <MemberRow member={team.mangaka} />
            {team.editor ? (
              <MemberRow member={team.editor} />
            ) : (
              <li className="flex items-center justify-between gap-3 text-sm py-1.5 text-muted-foreground">
                <span className="flex items-center gap-2">
                  <User size={14} />
                  Chưa mời editor
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-border">Editor</span>
              </li>
            )}
          </ul>
        </section>

        <section>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Hội đồng ({team.boardReviewers.length}/3)
          </p>
          <ul>
            {boardSlots.map(member =>
              member.id.startsWith('empty-board-') ? (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-3 text-sm py-1.5 border-b border-border/60 last:border-0 text-muted-foreground"
                >
                  <span className="flex items-center gap-2">
                    <Users size={14} />
                    Chưa nhận
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-border">Board</span>
                </li>
              ) : (
                <MemberRow key={member.id} member={member} />
              )
            )}
          </ul>
          {team.boardReviewers.some(m => m.role === 'board_lead') ? null : team.boardReviewers.length > 0 ? (
            <p className="text-xs text-muted-foreground mt-2">Chưa chọn phụ trách chính (Lead).</p>
          ) : null}
        </section>

        <section>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Trợ lí studio ({team.assistants.length})
          </p>
          {team.assistants.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có trợ lí trong studio mangaka.</p>
          ) : (
            <ul>
              {team.assistants.map(member => (
                <MemberRow key={member.id} member={member} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </Card>
  );
}
