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
    <li className="flex items-center justify-between gap-3 text-sm py-2 border-b border-border/50 last:border-0">
      <span className="flex items-center gap-2.5 min-w-0">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${meta.badgeClass}`}>
          <Icon size={13} />
        </span>
        <span className="font-medium truncate">{member.name}</span>
      </span>
      <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${meta.badgeClass}`}>
        {meta.label}
      </span>
    </li>
  );
}

function TeamSections({ team }: { team: SeriesTeam }) {
  const boardSlots = [...team.boardReviewers];
  while (boardSlots.length < 3) {
    boardSlots.push({
      id: `empty-board-${boardSlots.length}`,
      name: 'Chưa có',
      role: 'board',
    });
  }

  return (
    <div className="space-y-4">
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Sáng tạo</p>
        <ul className="rounded-xl bg-muted/35 px-3">
          <MemberRow member={team.mangaka} />
          {team.editor ? (
            <MemberRow member={team.editor} />
          ) : (
            <li className="flex items-center justify-between gap-3 text-sm py-2 text-muted-foreground">
              <span className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background">
                  <User size={13} />
                </span>
                Chưa gán editor
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-border">Editor</span>
            </li>
          )}
        </ul>
      </section>

      <section>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Hội đồng ({team.boardReviewers.length}/3)
        </p>
        <ul className="rounded-xl bg-muted/35 px-3">
          {boardSlots.map(member =>
            member.id.startsWith('empty-board-') ? (
              <li
                key={member.id}
                className="flex items-center justify-between gap-3 text-sm py-2 border-b border-border/50 last:border-0 text-muted-foreground"
              >
                <span className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background">
                    <Users size={13} />
                  </span>
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
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Trợ lí studio ({team.assistants.length})
        </p>
        {team.assistants.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-xl bg-muted/35 px-3 py-3">
            Chưa có trợ lí trong studio mangaka.
          </p>
        ) : (
          <ul className="rounded-xl bg-muted/35 px-3">
            {team.assistants.map(member => (
              <MemberRow key={member.id} member={member} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

interface SeriesTeamCardProps {
  team: SeriesTeam | null;
  loading?: boolean;
  className?: string;
  /** Không bọc Card — dùng khi nhúng trong khung cột. */
  embedded?: boolean;
}

export default function SeriesTeamCard({ team, loading, className, embedded }: SeriesTeamCardProps) {
  if (loading) {
    if (embedded) {
      return <p className="text-sm text-muted-foreground">Đang tải đội ngũ...</p>;
    }
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

  if (embedded) {
    return <TeamSections team={team} />;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Đội ngũ series</CardTitle>
      </CardHeader>
      <TeamSections team={team} />
    </Card>
  );
}
