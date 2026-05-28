// ─── Types ────────────────────────────────────────────────────────────────────

export type UserStatus = 'Active' | 'Inactive' | 'Locked' | 'Pending';
export type RoleName = 'admin' | 'mangaka' | 'assistant' | 'editor' | 'board';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: RoleName;
  status: UserStatus;
  createdAt: string;
  lastLogin: string;
  avatar: string;
  note?: string;
}

export interface SystemActivity {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: RoleName;
  action: string;
  target: string;
  status: 'Success' | 'Failed' | 'Warning';
}

export interface RoleDefinition {
  id: RoleName;
  label: string;
  color: string;
  bg: string;
  description: string;
  userCount: number;
  permissions: string[];
}

// ─── Admin Users ──────────────────────────────────────────────────────────────

const adminUsers: AdminUser[] = [
  {
    id: 'ad1',
    name: 'Sato Kenji',
    email: 'admin@mangaflow.jp',
    phone: '+81-90-0001-0001',
    role: 'admin',
    status: 'Active',
    createdAt: '2020-01-01',
    lastLogin: '2026-05-28T08:30:00Z',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=80&h=80&fit=crop&auto=format',
    note: 'Quản trị viên hệ thống chính.',
  },
  {
    id: 'mg1',
    name: 'Tanaka Hiroshi',
    email: 'hiroshi.tanaka@inkflow.jp',
    phone: '+81-90-1234-5678',
    role: 'mangaka',
    status: 'Active',
    createdAt: '2022-03-15',
    lastLogin: '2026-05-27T14:20:00Z',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format',
    note: 'Tác giả của "Blade of Heaven".',
  },
  {
    id: 'mg2',
    name: 'Aiko Suzuki',
    email: 'aiko.s@inkflow.jp',
    phone: '+81-90-2345-6789',
    role: 'mangaka',
    status: 'Active',
    createdAt: '2022-06-20',
    lastLogin: '2026-05-26T11:15:00Z',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&auto=format',
    note: 'Tác giả của "Neon Dreams".',
  },
  {
    id: 'mg3',
    name: 'Watanabe Ren',
    email: 'ren.w@inkflow.jp',
    phone: '+81-90-3456-7890',
    role: 'mangaka',
    status: 'Inactive',
    createdAt: '2021-11-10',
    lastLogin: '2026-02-14T09:00:00Z',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&auto=format',
    note: 'Tạm nghỉ phép dài hạn.',
  },
  {
    id: 'mg4',
    name: 'Kimura Yuki',
    email: 'yuki.k@inkflow.jp',
    phone: '+81-90-4567-8901',
    role: 'mangaka',
    status: 'Pending',
    createdAt: '2026-05-20',
    lastLogin: '—',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&auto=format',
    note: 'Đang chờ xác minh tài khoản.',
  },
  {
    id: 'as1',
    name: 'Yamamoto Keiko',
    email: 'keiko.y@inkstudio.jp',
    phone: '+81-90-5678-9012',
    role: 'assistant',
    status: 'Active',
    createdAt: '2023-01-05',
    lastLogin: '2026-05-28T07:45:00Z',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&auto=format',
    note: 'Chuyên về background art.',
  },
  {
    id: 'as2',
    name: 'Ishida Taro',
    email: 'taro.i@inkstudio.jp',
    phone: '+81-90-6789-0123',
    role: 'assistant',
    status: 'Active',
    createdAt: '2023-04-12',
    lastLogin: '2026-05-27T16:30:00Z',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&auto=format',
    note: 'Chuyên về screentone và shading.',
  },
  {
    id: 'as3',
    name: 'Ogawa Mio',
    email: 'mio.o@inkstudio.jp',
    phone: '+81-90-7890-1234',
    role: 'assistant',
    status: 'Locked',
    createdAt: '2022-09-01',
    lastLogin: '2026-04-10T12:00:00Z',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&auto=format',
    note: 'Tài khoản bị khóa do vi phạm chính sách.',
  },
  {
    id: 'ed1',
    name: 'Kobayashi Akira',
    email: 'akira.k@inkflow-editorial.jp',
    phone: '+81-90-8901-2345',
    role: 'editor',
    status: 'Active',
    createdAt: '2015-04-01',
    lastLogin: '2026-05-28T09:00:00Z',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&auto=format',
    note: 'Tantou Editor cấp cao.',
  },
  {
    id: 'ed2',
    name: 'Hayashi Nao',
    email: 'nao.h@inkflow-editorial.jp',
    phone: '+81-90-9012-3456',
    role: 'editor',
    status: 'Active',
    createdAt: '2018-07-20',
    lastLogin: '2026-05-27T15:00:00Z',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&h=80&fit=crop&auto=format',
    note: 'Chuyên thể loại shojo.',
  },
  {
    id: 'bd1',
    name: 'Nakamura Yuki',
    email: 'yuki.n@inkflow-board.jp',
    phone: '+81-90-0123-4567',
    role: 'board',
    status: 'Active',
    createdAt: '2012-01-15',
    lastLogin: '2026-05-28T08:00:00Z',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=80&h=80&fit=crop&auto=format',
    note: 'Giám đốc Hội đồng Biên tập.',
  },
  {
    id: 'bd2',
    name: 'Kato Daisuke',
    email: 'daisuke.k@inkflow-board.jp',
    phone: '+81-90-1230-5679',
    role: 'board',
    status: 'Active',
    createdAt: '2013-05-10',
    lastLogin: '2026-05-26T17:00:00Z',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&auto=format',
    note: 'Thành viên hội đồng, phụ trách mảng kinh doanh.',
  },
  {
    id: 'mg5',
    name: 'Fujita Sora',
    email: 'sora.f@inkflow.jp',
    phone: '+81-90-2340-6790',
    role: 'mangaka',
    status: 'Active',
    createdAt: '2024-02-14',
    lastLogin: '2026-05-25T10:30:00Z',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop&auto=format',
    note: 'Tác giả mới, series đầu tay.',
  },
];

// ─── System Activities ────────────────────────────────────────────────────────

const systemActivities: SystemActivity[] = [
  {
    id: 'act1',
    timestamp: '2026-05-28T08:30:00Z',
    userId: 'ad1',
    userName: 'Sato Kenji',
    userRole: 'admin',
    action: 'Login',
    target: 'Admin Panel',
    status: 'Success',
  },
  {
    id: 'act2',
    timestamp: '2026-05-28T08:35:00Z',
    userId: 'ad1',
    userName: 'Sato Kenji',
    userRole: 'admin',
    action: 'Lock',
    target: 'Tài khoản Ogawa Mio (as3)',
    status: 'Success',
  },
  {
    id: 'act3',
    timestamp: '2026-05-28T07:45:00Z',
    userId: 'as1',
    userName: 'Yamamoto Keiko',
    userRole: 'assistant',
    action: 'Login',
    target: 'Hệ thống',
    status: 'Success',
  },
  {
    id: 'act4',
    timestamp: '2026-05-28T09:00:00Z',
    userId: 'ed1',
    userName: 'Kobayashi Akira',
    userRole: 'editor',
    action: 'Approve',
    target: 'Chapter 12 - Blade of Heaven',
    status: 'Success',
  },
  {
    id: 'act5',
    timestamp: '2026-05-27T16:30:00Z',
    userId: 'as2',
    userName: 'Ishida Taro',
    userRole: 'assistant',
    action: 'Edit',
    target: 'Task #T45 - Screentone Background',
    status: 'Success',
  },
  {
    id: 'act6',
    timestamp: '2026-05-27T15:00:00Z',
    userId: 'ed2',
    userName: 'Hayashi Nao',
    userRole: 'editor',
    action: 'Create',
    target: 'Annotation - Chapter 5 Neon Dreams',
    status: 'Success',
  },
  {
    id: 'act7',
    timestamp: '2026-05-27T14:20:00Z',
    userId: 'mg1',
    userName: 'Tanaka Hiroshi',
    userRole: 'mangaka',
    action: 'Edit',
    target: 'Chapter 13 - Blade of Heaven',
    status: 'Success',
  },
  {
    id: 'act8',
    timestamp: '2026-05-27T13:00:00Z',
    userId: 'bd1',
    userName: 'Nakamura Yuki',
    userRole: 'board',
    action: 'Approve',
    target: 'Series Submission - Neon Dreams',
    status: 'Success',
  },
  {
    id: 'act9',
    timestamp: '2026-05-27T11:30:00Z',
    userId: 'mg2',
    userName: 'Aiko Suzuki',
    userRole: 'mangaka',
    action: 'Create',
    target: 'Chapter 8 - Neon Dreams',
    status: 'Success',
  },
  {
    id: 'act10',
    timestamp: '2026-05-27T10:15:00Z',
    userId: 'as1',
    userName: 'Yamamoto Keiko',
    userRole: 'assistant',
    action: 'Login',
    target: 'Hệ thống',
    status: 'Failed',
  },
  {
    id: 'act11',
    timestamp: '2026-05-27T10:20:00Z',
    userId: 'as1',
    userName: 'Yamamoto Keiko',
    userRole: 'assistant',
    action: 'Login',
    target: 'Hệ thống',
    status: 'Success',
  },
  {
    id: 'act12',
    timestamp: '2026-05-26T17:00:00Z',
    userId: 'bd2',
    userName: 'Kato Daisuke',
    userRole: 'board',
    action: 'Approve',
    target: 'Publishing Schedule - Q3 2026',
    status: 'Success',
  },
  {
    id: 'act13',
    timestamp: '2026-05-26T16:00:00Z',
    userId: 'ad1',
    userName: 'Sato Kenji',
    userRole: 'admin',
    action: 'Create',
    target: 'Tài khoản Kimura Yuki (mg4)',
    status: 'Success',
  },
  {
    id: 'act14',
    timestamp: '2026-05-26T15:30:00Z',
    userId: 'mg5',
    userName: 'Fujita Sora',
    userRole: 'mangaka',
    action: 'Create',
    target: 'Series Submission - Sky Wanderer',
    status: 'Warning',
  },
  {
    id: 'act15',
    timestamp: '2026-05-26T14:00:00Z',
    userId: 'ed1',
    userName: 'Kobayashi Akira',
    userRole: 'editor',
    action: 'Edit',
    target: 'Chapter 11 - Blade of Heaven (Yêu cầu chỉnh sửa)',
    status: 'Warning',
  },
  {
    id: 'act16',
    timestamp: '2026-05-25T11:00:00Z',
    userId: 'mg3',
    userName: 'Watanabe Ren',
    userRole: 'mangaka',
    action: 'Logout',
    target: 'Hệ thống',
    status: 'Success',
  },
  {
    id: 'act17',
    timestamp: '2026-05-25T10:30:00Z',
    userId: 'mg5',
    userName: 'Fujita Sora',
    userRole: 'mangaka',
    action: 'Edit',
    target: 'Profile - Cập nhật thông tin',
    status: 'Success',
  },
  {
    id: 'act18',
    timestamp: '2026-05-24T09:45:00Z',
    userId: 'ad1',
    userName: 'Sato Kenji',
    userRole: 'admin',
    action: 'Edit',
    target: 'System Settings - Cài đặt bảo mật',
    status: 'Success',
  },
  {
    id: 'act19',
    timestamp: '2026-05-24T08:00:00Z',
    userId: 'as3',
    userName: 'Ogawa Mio',
    userRole: 'assistant',
    action: 'Login',
    target: 'Hệ thống',
    status: 'Failed',
  },
  {
    id: 'act20',
    timestamp: '2026-05-23T17:30:00Z',
    userId: 'bd1',
    userName: 'Nakamura Yuki',
    userRole: 'board',
    action: 'Approve',
    target: 'Vote Input - Tuần 21',
    status: 'Success',
  },
];

// ─── Role Definitions ─────────────────────────────────────────────────────────

const roleDefinitions: RoleDefinition[] = [
  {
    id: 'admin',
    label: 'Admin',
    color: '#D72638',
    bg: '#FEE2E2',
    description: 'Quản trị viên hệ thống. Có toàn quyền quản lý người dùng, cấu hình hệ thống và giám sát bảo mật.',
    userCount: 1,
    permissions: [
      'Xem toàn bộ người dùng',
      'Tạo / Chỉnh sửa / Xóa người dùng',
      'Khóa / Mở khóa tài khoản',
      'Đặt lại mật khẩu người dùng',
      'Xem log hoạt động hệ thống',
      'Cấu hình chính sách hệ thống',
      'Quản lý vai trò và phân quyền',
      'Xuất báo cáo hệ thống',
    ],
  },
  {
    id: 'mangaka',
    label: 'Mangaka',
    color: '#4B3F72',
    bg: '#EDE9FE',
    description: 'Tác giả manga. Tạo và quản lý series, chương, giao việc cho trợ lý và nộp bài cho editor.',
    userCount: 5,
    permissions: [
      'Tạo / Chỉnh sửa series của mình',
      'Tạo / Quản lý chương và trang',
      'Giao nhiệm vụ cho trợ lý',
      'Xem xét và duyệt kết quả công việc',
      'Nộp chương cho editor',
      'Xem xếp hạng series',
      'Xem lịch sử nộp bài',
    ],
  },
  {
    id: 'assistant',
    label: 'Assistant',
    color: '#2563EB',
    bg: '#DBEAFE',
    description: 'Trợ lý sáng tác. Nhận và thực hiện các nhiệm vụ được giao bởi mangaka (background, screentone, shading...).',
    userCount: 3,
    permissions: [
      'Xem danh sách nhiệm vụ được giao',
      'Cập nhật tiến độ nhiệm vụ',
      'Nộp kết quả công việc',
      'Xem yêu cầu chỉnh sửa',
      'Xem lịch sử thu nhập',
      'Xem lịch làm việc cá nhân',
    ],
  },
  {
    id: 'editor',
    label: 'Editor',
    color: '#F97316',
    bg: '#FFEDD5',
    description: 'Biên tập viên. Phụ trách review chương, theo dõi xếp hạng, và bảo vệ series trước hội đồng.',
    userCount: 2,
    permissions: [
      'Xem series được phân công',
      'Review và duyệt chương',
      'Thêm chú thích và phản hồi',
      'Theo dõi xếp hạng series',
      'Lập báo cáo bảo vệ series',
      'Xem lịch sử review',
    ],
  },
  {
    id: 'board',
    label: 'Board',
    color: '#7C3AED',
    bg: '#EDE9FE',
    description: 'Thành viên hội đồng biên tập. Phê duyệt series mới, quản lý lịch xuất bản và quyết định chiến lược.',
    userCount: 2,
    permissions: [
      'Xem và duyệt nộp bài series mới',
      'Nhập dữ liệu vote độc giả',
      'Xem bảng xếp hạng toàn bộ',
      'Quyết định tiếp tục/hủy series',
      'Quản lý lịch xuất bản',
      'Xem báo cáo phân tích',
      'Thảo luận hội đồng',
    ],
  },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

export function getAdminUsers(): AdminUser[] {
  return adminUsers;
}

export function getAdminUserById(id: string): AdminUser | undefined {
  return adminUsers.find(u => u.id === id);
}

export function getSystemActivities(): SystemActivity[] {
  return systemActivities;
}

export function getRoleDefinitions(): RoleDefinition[] {
  return roleDefinitions;
}

export function getRoleDefinitionById(id: RoleName): RoleDefinition | undefined {
  return roleDefinitions.find(r => r.id === id);
}

export function getAdminStats() {
  const totalUsers = adminUsers.length;
  const activeUsers = adminUsers.filter(u => u.status === 'Active').length;
  const lockedUsers = adminUsers.filter(u => u.status === 'Locked').length;
  const pendingUsers = adminUsers.filter(u => u.status === 'Pending').length;
  const publishingSeries = 8; // mock value
  const newUsersThisMonth = adminUsers.filter(u => {
    const created = new Date(u.createdAt);
    return created.getMonth() === 4 && created.getFullYear() === 2026; // May 2026
  }).length;

  const roleDistribution: Record<RoleName, number> = {
    admin: adminUsers.filter(u => u.role === 'admin').length,
    mangaka: adminUsers.filter(u => u.role === 'mangaka').length,
    assistant: adminUsers.filter(u => u.role === 'assistant').length,
    editor: adminUsers.filter(u => u.role === 'editor').length,
    board: adminUsers.filter(u => u.role === 'board').length,
  };

  return { totalUsers, activeUsers, lockedUsers, pendingUsers, publishingSeries, newUsersThisMonth, roleDistribution };
}
