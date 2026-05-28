# InkFlow Design System — Manga Editorial Pro

> Version 1.0 · Tailwind CSS v4 · React 19 · shadcn/ui

Design system cho **Manga Creation Workflow and Publishing Management System**.  
Phong cách: _professional manga publishing dashboard_ — sạch, editorial, chuyên nghiệp. Không anime, không neon.

---

## Mục Lục

1. [Triết Lý Thiết Kế](#1-triết-lý-thiết-kế)
2. [Font & Typography](#2-font--typography)
3. [Color Tokens](#3-color-tokens)
4. [Spacing & Sizing](#4-spacing--sizing)
5. [Border Radius](#5-border-radius)
6. [Shadows](#6-shadows)
7. [Components — Primitives](#7-components--primitives)
8. [Components — Domain](#8-components--domain)
9. [Layout System](#9-layout-system)
10. [Icon Usage](#10-icon-usage)
11. [Status & Badge Patterns](#11-status--badge-patterns)
12. [Role-Based UI](#12-role-based-ui)
13. [Dark Mode](#13-dark-mode)
14. [File Structure](#14-file-structure)
15. [Auth & Credentials](#15-auth--credentials)

---

## 1. Triết Lý Thiết Kế

| Nguyên tắc                   | Áp dụng                                                        |
| ---------------------------- | -------------------------------------------------------------- |
| **Editorial first**          | Ưu tiên khả năng đọc, phân cấp thông tin rõ ràng               |
| **Warm neutrals**            | Nền kem `#F7F3EA`, card `#FFFDF8` tạo cảm giác giấy in         |
| **Red as authority**         | Primary đỏ `#D72638` chỉ dùng cho action chính và active state |
| **Dark sidebar**             | `#1F1F1F` tạo contrast mạnh, phân tách navigation khỏi content |
| **No decorations**           | Tránh gradient, shadow nặng, animation phức tạp                |
| **Responsive desktop-first** | Desktop ưu tiên, mobile cơ bản                                 |

---

## 2. Font & Typography

### Font Stack

```css
font-family:
  "Be Vietnam Pro", "Inter", sans-serif; /* body, UI */
font-family:
  "JetBrains Mono", monospace; /* numbers, code, vote scores */
```

**Import** (chỉ trong `/src/styles/fonts.css`):

```css
@import url("https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600&family=JetBrains+Mono:wght@400;500;600&display=swap");
```

### Type Scale

| Element          | Size               | Weight  | Line Height | Letter Spacing |
| ---------------- | ------------------ | ------- | ----------- | -------------- |
| `h1`             | `text-2xl` (24px)  | 700     | 1.3         | −0.02em        |
| `h2`             | `text-xl` (20px)   | 600     | 1.4         | −0.01em        |
| `h3`             | `text-lg` (18px)   | 600     | 1.4         | —              |
| `h4`             | `text-base` (16px) | 600     | 1.5         | —              |
| `label`          | `text-sm` (14px)   | 600     | 1.5         | +0.01em        |
| `button`         | `text-sm` (14px)   | 600     | 1.5         | —              |
| `body / input`   | `text-sm` (14px)   | 400     | 1.5         | —              |
| `caption / meta` | `text-xs` (12px)   | 400–500 | 1.5         | —              |

> **Lưu ý:** Không dùng Tailwind font-size classes trực tiếp trong JSX (text-2xl, font-bold, leading-none) trừ khi cần override. Headings và body đã được set sẵn trong `theme.css`.

---

## 3. Color Tokens

Tất cả màu được khai báo bằng CSS custom properties trong `src/styles/theme.css` và mapping vào Tailwind thông qua `@theme inline`.

### 3.1 Core Palette

| Token CSS            | Light Mode | Dark Mode | Tailwind Class          | Dùng cho                    |
| -------------------- | ---------- | --------- | ----------------------- | --------------------------- |
| `--background`       | `#F7F3EA`  | `#1A1714` | `bg-background`         | Nền trang                   |
| `--foreground`       | `#1F1F1F`  | `#F7F3EA` | `text-foreground`       | Text chính                  |
| `--card`             | `#FFFDF8`  | `#252019` | `bg-card`               | Nền card, popover           |
| `--card-foreground`  | `#1F1F1F`  | `#F7F3EA` | `text-card-foreground`  | Text trong card             |
| `--muted`            | `#EDE9DF`  | `#2E2921` | `bg-muted`              | Vùng phụ, hover nhẹ         |
| `--muted-foreground` | `#6B7280`  | `#9CA3AF` | `text-muted-foreground` | Text phụ, placeholder, meta |
| `--border`           | `#D8D3C8`  | `#3A342B` | `border-border`         | Viền card, input, divider   |
| `--input-background` | `#F0EBE0`  | `#2E2921` | `bg-input-background`   | Nền input, textarea, select |
| `--ring`             | `#D72638`  | `#D72638` | `ring-ring`             | Focus ring                  |

### 3.2 Brand Colors

| Token                    | Hex       | Tailwind                          | Dùng cho                       |
| ------------------------ | --------- | --------------------------------- | ------------------------------ |
| `--primary`              | `#D72638` | `bg-primary` / `text-primary`     | Nút chính, active menu, accent |
| `--primary-foreground`   | `#FFFDF8` | `text-primary-foreground`         | Text trên nền primary          |
| `--secondary`            | `#4B3F72` | `bg-secondary` / `text-secondary` | Accent tím, badge secondary    |
| `--secondary-foreground` | `#FFFDF8` | `text-secondary-foreground`       | Text trên nền secondary        |
| `--accent`               | `#F2C94C` | `bg-accent` / `text-accent`       | Highlight vàng, hover ghost    |
| `--accent-foreground`    | `#1F1F1F` | `text-accent-foreground`          | Text trên nền accent           |
| `--destructive`          | `#DC2626` | `bg-destructive`                  | Xóa, hủy, lỗi                  |

### 3.3 Sidebar Tokens

| Token                  | Light / Dark          | Tailwind                  |
| ---------------------- | --------------------- | ------------------------- |
| `--sidebar`            | `#1F1F1F` / `#151310` | `bg-sidebar`              |
| `--sidebar-foreground` | `#F7F3EA` / `#F7F3EA` | `text-sidebar-foreground` |
| `--sidebar-accent`     | `#2E2E2E` / `#252019` | `bg-sidebar-accent`       |
| `--sidebar-border`     | `#333333` / `#2E2921` | `border-sidebar-border`   |
| `--sidebar-primary`    | `#D72638`             | `bg-sidebar-primary`      |

### 3.4 Status Colors

Dùng trực tiếp `className` inline vì status badge cần màu custom không có trong palette chính.

| Status                  | Background      | Text              | Border              | Hex       |
| ----------------------- | --------------- | ----------------- | ------------------- | --------- |
| **Draft**               | `bg-gray-100`   | `text-gray-600`   | `border-gray-200`   | `#9CA3AF` |
| **Pending / Submitted** | `bg-blue-100`   | `text-blue-700`   | `border-blue-200`   | `#2563EB` |
| **Approved**            | `bg-green-100`  | `text-green-700`  | `border-green-200`  | `#16A34A` |
| **In Progress**         | `bg-violet-100` | `text-violet-700` | `border-violet-200` | `#4B3F72` |
| **Revision Required**   | `bg-orange-100` | `text-orange-700` | `border-orange-200` | `#F97316` |
| **At Risk**             | `bg-red-100`    | `text-red-700`    | `border-red-200`    | `#DC2626` |
| **Published**           | `bg-purple-100` | `text-purple-700` | `border-purple-200` | `#7C3AED` |
| **Cancelled**           | `bg-gray-100`   | `text-gray-700`   | `border-gray-200`   | `#374151` |

```tsx
// Ví dụ pattern badge status
<Badge className="bg-green-100 text-green-700 border-green-200">Approved</Badge>
<Badge className="bg-red-100 text-red-700 border-red-200">At Risk</Badge>
<Badge className="bg-blue-100 text-blue-700 border-blue-200">Pending</Badge>
```

### 3.5 Chart Colors

| Slot        | Hex       | Dùng cho                     |
| ----------- | --------- | ---------------------------- |
| `--chart-1` | `#D72638` | Series chính, primary metric |
| `--chart-2` | `#4B3F72` | Series phụ                   |
| `--chart-3` | `#F2C94C` | Accent / highlight           |
| `--chart-4` | `#16A34A` | Tích cực, tăng trưởng        |
| `--chart-5` | `#2563EB` | Thông tin, trung tính        |

---

## 4. Spacing & Sizing

Dùng Tailwind spacing scale chuẩn (1 unit = 4px).

### Page Wrapper

```tsx
// Tất cả page đều dùng pattern này
<div className="p-6 space-y-6">{/* content */}</div>
```

### Grid Patterns

```tsx
// 2 cột
<div className="grid gap-4 grid-cols-2">

// 3 cột responsive
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

// 4 cột responsive
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

// 5 cột stats (dashboard summary)
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">

// 2+1 detail layout (main content + sticky sidebar)
<div className="grid gap-6 lg:grid-cols-3">
  <div className="lg:col-span-2 space-y-6"> {/* main */} </div>
  <div> {/* sticky sidebar */} </div>
</div>
```

### Component Internal Spacing

| Bối cảnh                         | Padding                      |
| -------------------------------- | ---------------------------- |
| Card default (qua `CardContent`) | `px-6`, `pb-6`, `pt-6`       |
| Card compact (override)          | `p-4`                        |
| Card tight (stat cards)          | `p-4` hoặc `p-5`             |
| Section gap                      | `space-y-6`                  |
| Item list gap                    | `space-y-3` hoặc `space-y-4` |
| Inline icon + text gap           | `gap-2` hoặc `gap-3`         |

---

## 5. Border Radius

| Token       | Value         | Tailwind      | Dùng cho                   |
| ----------- | ------------- | ------------- | -------------------------- |
| `--radius`  | `16px` (1rem) | base          | —                          |
| `radius-sm` | `10px`        | `rounded-sm`  | —                          |
| `radius-md` | `12px`        | `rounded-md`  | Buttons, inputs, dropdowns |
| `radius-lg` | `16px`        | `rounded-xl`  | Cards, panels              |
| `radius-xl` | `20px`        | `rounded-2xl` | Hero cards, modals         |

```tsx
// Cards → rounded-xl (16px)
// Buttons → rounded-md (12px, via CVA default)
// Badges → rounded-md (via CVA default)
// Sidebar nav items → rounded-xl
// Stat mini-blocks → rounded-lg
// Avatar → rounded-full
```

---

## 6. Shadows

| Class       | Dùng cho                    |
| ----------- | --------------------------- |
| `shadow-sm` | Card mặc định, table        |
| `shadow-md` | Card hover, elevated panels |
| `shadow-lg` | Modal, dropdown             |
| (none)      | Inline elements, list items |

---

## 7. Components — Primitives

Tất cả primitive components được lấy từ **shadcn/ui** và nằm tại `src/app/components/ui/`.

### 7.1 Button

```tsx
import { Button } from '../../app/components/ui/button';

// Variants
<Button variant="default">   // đỏ primary — action chính
<Button variant="secondary"> // tím — action phụ
<Button variant="outline">   // viền — action thứ ba
<Button variant="ghost">     // không viền — action ẩn (icon, link)
<Button variant="destructive"> // đỏ đậm — xóa/hủy
<Button variant="link">      // underline — link style

// Sizes
<Button size="lg">   // h-10, px-6
<Button size="default"> // h-9, px-4
<Button size="sm">   // h-8, px-3
<Button size="icon"> // size-9, square
```

### 7.2 Badge

```tsx
import { Badge } from '../../app/components/ui/badge';

<Badge variant="default">    // đỏ primary
<Badge variant="secondary">  // tím
<Badge variant="outline">    // viền — genre, tag
<Badge variant="destructive"> // đỏ đậm

// Status badges — dùng className override
<Badge className="bg-green-100 text-green-700 border-green-200">Approved</Badge>
```

### 7.3 Card

```tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../app/components/ui/card';

// Cấu trúc chuẩn
<Card className="shadow-sm">
  <CardHeader>
    <CardTitle>Tiêu đề</CardTitle>
    <CardDescription>Mô tả</CardDescription>
  </CardHeader>
  <CardContent>
    {/* nội dung */}
  </CardContent>
</Card>

// Stat card (không dùng CardHeader/CardTitle mặc định)
<Card className="shadow-sm">
  <CardContent className="p-4">
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs font-medium text-muted-foreground">Label</p>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <p className="text-2xl font-bold">42</p>
    <p className="text-xs text-muted-foreground">Sub-text</p>
  </CardContent>
</Card>
```

### 7.4 Input

```tsx
import { Input } from '../../app/components/ui/input';

// Mặc định
<Input placeholder="Nhập..." />

// Với icon search
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input placeholder="Tìm kiếm..." className="pl-9" />
</div>
```

### 7.5 Select

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../app/components/ui/select";

<Select value={value} onValueChange={setValue}>
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="Chọn..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Tất cả</SelectItem>
    <SelectItem value="active">Đang hoạt động</SelectItem>
  </SelectContent>
</Select>;
```

### 7.6 Textarea

```tsx
import { Textarea } from "../../app/components/ui/textarea";

<Textarea
  placeholder="Nhập nội dung..."
  rows={4}
  className="resize-none"
/>;
```

### 7.7 Các primitive khác

| Component                                                                 | Import path   | Ghi chú             |
| ------------------------------------------------------------------------- | ------------- | ------------------- |
| `Dialog`                                                                  | `…/dialog`    | Modal               |
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`                          | `…/tabs`      | Tab navigation      |
| `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` | `…/table`     | Data table          |
| `Progress`                                                                | `…/progress`  | Progress bar shadcn |
| `Avatar`, `AvatarImage`, `AvatarFallback`                                 | `…/avatar`    | User avatar         |
| `Tooltip`, `TooltipContent`, `TooltipTrigger`                             | `…/tooltip`   | Tooltip             |
| `Separator`                                                               | `…/separator` | Divider ngang/dọc   |
| `Skeleton`                                                                | `…/skeleton`  | Loading placeholder |
| `Checkbox`                                                                | `…/checkbox`  | Checkbox            |
| `Switch`                                                                  | `…/switch`    | Toggle switch       |

---

## 8. Components — Domain

Custom components tái sử dụng được chia theo role, nằm trong `src/components/ui/` (shared) và `src/app/components/ui/{role}/` (role-specific).

### 8.1 Shared (`src/components/ui/`)

#### EmptyState

```tsx
import EmptyState from "../../components/ui/EmptyState";

<EmptyState
  icon={<FileText size={24} />} // optional
  title="Không có dữ liệu"
  description="Chưa có series nào được tạo." // optional
  action={<Button>Tạo ngay</Button>} // optional
/>;
```

#### ProgressBar

```tsx
import ProgressBar from '../../components/ui/ProgressBar';

<ProgressBar value={75} />                    // auto color
<ProgressBar value={75} color="green" />      // manual color
<ProgressBar value={75} size="md" showLabel /> // với label %

// color options: 'primary' | 'green' | 'orange' | 'red' | 'purple'
// Auto color: ≥80% → green, ≥50% → primary(red), ≥25% → orange, <25% → red
```

#### SearchInput, FilterDropdown, Modal, Tabs, Card, Badge, Button

Có các version custom tại `src/components/ui/` với props đơn giản hóa. Dùng các primitive shadcn khi cần tùy chỉnh cao hơn.

### 8.2 Editor Components (`src/app/components/ui/editor/`)

```tsx
import {
  SeriesSummaryCard,
  ChapterReviewCard,
  ReviewStatusBadge,
  RiskBadge,
} from "../../app/components/ui/editor";
```

### 8.3 Assistant Components (`src/app/components/ui/assistant/`)

```tsx
import {
  TaskCard,
  TaskStatusBadge,
  DeadlineCard,
  FeedbackBox,
  IncomeSummaryCard,
  MangaPagePreview,
  UploadResultBox,
} from "../../app/components/ui/assistant";
```

### 8.4 Board Components (`src/app/components/ui/board/`)

```tsx
import {
  SubmissionStatusBadge,
  ScheduleStatusBadge,
  RankingStatusBadge,
  PublishingTypeBadge,
} from "../../app/components/ui/board";
```

| Component               | Dùng cho                                                      |
| ----------------------- | ------------------------------------------------------------- |
| `SubmissionStatusBadge` | `BoardSubmissionStatus` — Pending/Approved/Rejected/More Info |
| `ScheduleStatusBadge`   | `PublishingScheduleStatus` — Active/Paused/Cancelled          |
| `RankingStatusBadge`    | `At Risk / Stable / Rising`                                   |
| `PublishingTypeBadge`   | `Weekly` (đỏ) / `Monthly` (tím)                               |

---

## 9. Layout System

### 9.1 Cấu trúc tổng thể

```
App
├── LoginPage (no layout)
└── MainLayout
    ├── Sidebar (w-[220px], bg-sidebar #1F1F1F)
    └── Content area (flex-1, overflow-y-auto)
        ├── Topbar (page title, breadcrumb, search, notification, avatar)
        └── <Outlet /> → Page content
```

### 9.2 Sidebar

- Width: `w-[220px]` fixed, `shrink-0`
- Background: `bg-sidebar` (`#1F1F1F`)
- Text: `text-sidebar-foreground` (`#F7F3EA`)
- Active item: `bg-primary text-white rounded-xl`
- Hover item: `bg-sidebar-accent text-sidebar-foreground rounded-xl`
- Nav items có `exact?: boolean` để so khớp path chính xác

### 9.3 Page Content

```tsx
// Mọi page dùng wrapper này
<div className="p-6 space-y-6">
  {/* Page header */}
  <div>
    <h1>Tiêu đề trang</h1>
    <p className="text-muted-foreground mt-1">Mô tả ngắn</p>
  </div>

  {/* Actions / Filters */}
  <div className="flex flex-col sm:flex-row gap-3">
    {/* search, filter */}
  </div>

  {/* Main content */}
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {/* cards */}
  </div>
</div>
```

### 9.4 Welcome Card (Dashboard)

Pattern chuẩn cho dashboard welcome card:

```tsx
<Card
  className="border-0 shadow-md"
  style={{
    background:
      "linear-gradient(135deg, #1F1F1F 0%, #3a1f1f 100%)",
  }}
>
  <CardContent className="p-6">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-white/60 text-sm font-medium mb-1">
          Sub-title / Role
        </p>
        <h1 className="text-2xl font-bold text-white mb-2">
          Chào mừng trở lại, {user.name}
        </h1>
        <p className="text-white/70 text-sm">
          Mô tả ngắn về trạng thái hiện tại...
        </p>
      </div>
      <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
        <Icon className="h-6 w-6 text-primary" />
      </div>
    </div>
  </CardContent>
</Card>
```

### 9.5 Section Header với "Xem tất cả"

```tsx
<div className="flex items-center justify-between mb-4">
  <h2 className="text-lg font-semibold">Tên Section</h2>
  <Button
    variant="ghost"
    size="sm"
    onClick={() => navigate("/path")}
    className="text-primary"
  >
    Xem tất cả <ArrowRight className="ml-1 h-3.5 w-3.5" />
  </Button>
</div>
```

### 9.6 Detail Page Layout (2 + 1)

```tsx
<div className="grid gap-6 lg:grid-cols-3">
  {/* Main content — 2/3 */}
  <div className="lg:col-span-2 space-y-6">
    {/* sections */}
  </div>

  {/* Sticky sidebar — 1/3 */}
  <div>
    <Card className="shadow-sm sticky top-6">
      {/* action panel */}
    </Card>
  </div>
</div>
```

---

## 10. Icon Usage

**Library:** `lucide-react` (duy nhất, không dùng thư viện khác)

```tsx
import { LayoutDashboard, BookOpen, FileText, ... } from 'lucide-react';
```

### Size Convention

| Bối cảnh              | Size                        |
| --------------------- | --------------------------- |
| Sidebar nav icon      | `size={18}`                 |
| Section title icon    | `h-4 w-4`                   |
| Stat card icon        | `h-4 w-4`                   |
| Welcome card icon     | `h-6 w-6`                   |
| Empty state icon      | `size={24}`                 |
| Button icon (sm)      | `h-3.5 w-3.5`               |
| Button icon (default) | `h-4 w-4` (tự động qua CVA) |

### Icon + Text Pattern

```tsx
// Inline icon trái
<div className="flex items-center gap-2">
  <BookOpen className="h-4 w-4 text-primary" />
  <span>Label</span>
</div>

// Icon trong button
<Button size="sm">
  <Eye className="h-3.5 w-3.5 mr-1" />
  Chi Tiết
</Button>

// Icon stat với background
<div className="p-2.5 rounded-xl bg-blue-50">
  <FileText className="h-5 w-5 text-blue-600" />
</div>
```

---

## 11. Status & Badge Patterns

### Pattern Chuẩn

```tsx
// 1. Badge với className override (khuyến nghị cho status)
<Badge className="bg-green-100 text-green-700 border-green-200">Approved</Badge>

// 2. Inline badge pill (dùng trong table, list item)
<span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
  Active
</span>

// 3. Custom Badge component (domain-specific)
<SubmissionStatusBadge status={sub.status} />
<PublishingTypeBadge type="Weekly" />
```

### Publishing Type

```tsx
// Weekly → đỏ primary
<Badge className="bg-[#D72638]/10 text-[#D72638] border-[#D72638]/20">Hàng Tuần</Badge>

// Monthly → tím secondary
<Badge className="bg-[#4B3F72]/10 text-[#4B3F72] border-[#4B3F72]/20">Hàng Tháng</Badge>
```

### Trend Indicators

```tsx
// Tăng
<TrendingUp className="h-4 w-4 text-green-600" />
// Giảm
<TrendingDown className="h-4 w-4 text-red-600" />
// Ổn định
<Minus className="h-4 w-4 text-gray-400" />

// Rank change text
<span className="text-xs font-semibold text-green-600">+3</span>
<span className="text-xs font-semibold text-red-600">-2</span>
```

---

## 12. Role-Based UI

### Roles & Routes

| Role        | Dashboard              | Sidebar Nav               |
| ----------- | ---------------------- | ------------------------- |
| `mangaka`   | `/mangaka/dashboard`   | `MANGAKA_NAV` (7 items)   |
| `assistant` | `/assistant/dashboard` | `ASSISTANT_NAV` (6 items) |
| `editor`    | `/editor/dashboard`    | `EDITOR_NAV` (5 items)    |
| `board`     | `/board/dashboard`     | `BOARD_NAV` (8 items)     |

### Sidebar Menu Per Role

**Mangaka:** Tổng quan, Series của tôi, Tạo Series, Chương, Nhiệm vụ, Nộp bài, Xếp hạng

**Assistant:** Dashboard, Công việc của tôi, Cần chỉnh sửa, Đã duyệt, Thu nhập, Lịch làm việc

**Editor:** Dashboard, Series phụ trách, Chapter Reviews, Ranking Watch, Series Defense

**Board:** Dashboard, Duyệt Series, Series Đã Duyệt, Lịch Xuất Bản, Nhập Vote Độc Giả, Bảng Xếp Hạng, Quyết Định Series, Báo Cáo

### Thêm Role Mới

1. Thêm `'newrole'` vào union type trong `User.role` (`mockData.ts`)
2. Thêm user instance và credentials vào `mockData.ts`
3. Thêm `NEW_ROLE_NAV` array vào `Sidebar.tsx`
4. Cập nhật NAV selection logic trong Sidebar
5. Thêm redirect trong `RootRedirect()` (`routes.tsx`)
6. Thêm routes `/newrole/*` trong `routes.tsx`
7. Thêm demo button trong `LoginPage.tsx`
8. Tạo pages trong `src/pages/newrole/`

---

## 13. Dark Mode

Dark mode được khai báo trong class `.dark` trong `theme.css`. Màu nền chuyển sang gam warm-dark thay vì pure black.

| Token          | Dark Value |
| -------------- | ---------- |
| `--background` | `#1A1714`  |
| `--card`       | `#252019`  |
| `--muted`      | `#2E2921`  |
| `--border`     | `#3A342B`  |
| `--sidebar`    | `#151310`  |

Tailwind dark variant: `dark:bg-...`, `dark:text-...`

---

## 14. File Structure

```
src/
├── app/
│   ├── App.tsx                    # RouterProvider wrapper
│   ├── routes.tsx                 # Tất cả routes + RootRedirect
│   └── components/
│       └── ui/
│           ├── {shadcn components}  # button, card, badge, input...
│           ├── assistant/           # TaskCard, TaskStatusBadge...
│           ├── editor/              # SeriesSummaryCard, ChapterReviewCard...
│           └── board/               # SubmissionStatusBadge, PublishingTypeBadge...
├── components/
│   ├── layout/
│   │   ├── MainLayout.tsx           # Auth check + Sidebar + Topbar + Outlet
│   │   ├── Sidebar.tsx              # Role-based navigation
│   │   └── Topbar.tsx               # Title, breadcrumb, avatar
│   └── ui/                          # Shared custom components
│       ├── EmptyState.tsx
│       ├── ProgressBar.tsx
│       ├── Badge.tsx                 # Custom Badge (simpler API)
│       ├── Button.tsx                # Custom Button
│       ├── Card.tsx                  # Custom Card
│       └── ...
├── data/
│   └── mockData.ts                  # Types, mock data, auth helpers
├── hooks/
│   └── usePageMeta.tsx              # Page title & breadcrumb context
├── pages/
│   ├── auth/                        # Login, Register, ForgotPassword
│   ├── common/                      # Profile, Settings, Notifications, NotFound
│   ├── mangaka/                     # 13 pages
│   ├── assistant/                   # 8 pages
│   ├── editor/                      # 5 pages
│   └── board/                       # 10 pages
└── styles/
    ├── fonts.css                    # @import Google Fonts (chỉ file này)
    ├── theme.css                    # CSS custom properties + @theme inline
    ├── globals.css                  # @import fonts, tailwind, theme
    └── tailwind.css                 # @import tailwindcss
```

### Import Path Rules

```tsx
// Từ src/pages/{role}/SomePage.tsx:
import { Card } from "../../app/components/ui/card"; // shadcn
import { Button } from "../../app/components/ui/button";
import EmptyState from "../../components/ui/EmptyState"; // custom shared
import { TaskCard } from "../../app/components/ui/assistant"; // role-specific
import { getLoggedInUser } from "../../data/mockData";
import { usePageMeta } from "../../hooks/usePageMeta";
```

---

## 15. Auth & Credentials

### Mock Credentials

| Role      | Email                          | Password       |
| --------- | ------------------------------ | -------------- |
| Mangaka   | `hiroshi.tanaka@inkflow.jp`    | `mangaka123`   |
| Assistant | `keiko.y@inkstudio.jp`         | `assistant123` |
| Editor    | `akira.k@inkflow-editorial.jp` | `editor123`    |
| Board     | `yuki.n@inkflow-board.jp`      | `board123`     |

### Auth Helpers (mockData.ts)

```ts
loginUser(email, password); // → User | null, lưu vào localStorage
logoutUser(); // xóa localStorage
getLoggedInUser(); // → User | null từ localStorage
```

### usePageMeta Hook

```tsx
import { usePageMeta } from "../../hooks/usePageMeta";

export default function SomePage() {
  usePageMeta({ title: "Tên Trang" });
  // hoặc với breadcrumb:
  usePageMeta({
    title: "Chi Tiết Series",
    breadcrumb: [
      { label: "Series", href: "/mangaka/series" },
      { label: "Voidwalker Chronicles" },
    ],
  });
  // ...
}
```

---

_Design system này được duy trì cùng với codebase. Khi thêm component mới hoặc thay đổi token màu, cập nhật file này tương ứng._