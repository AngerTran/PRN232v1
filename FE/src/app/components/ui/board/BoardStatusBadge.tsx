import { Badge } from '../badge';
import { type BoardSubmissionStatus, type PublishingScheduleStatus } from '../../../../types/domain';

const submissionColors: Record<BoardSubmissionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  'Pending Review': 'default',
  'Approved': 'secondary',
  'Rejected': 'destructive',
  'More Info Required': 'outline',
};

const submissionLabels: Record<BoardSubmissionStatus, string> = {
  'Pending Review': 'Chờ bỏ phiếu',
  'Approved': 'Đã Duyệt',
  'Rejected': 'Từ Chối',
  'More Info Required': 'Cần Thêm Thông Tin',
};

export function SubmissionStatusBadge({ status }: { status: BoardSubmissionStatus }) {
  return (
    <Badge variant={submissionColors[status]} className={
      status === 'Pending Review' ? 'bg-blue-100 text-blue-700 border-blue-200' :
      status === 'Approved' ? 'bg-green-100 text-green-700 border-green-200' :
      status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200' :
      'bg-amber-100 text-amber-700 border-amber-200'
    }>
      {submissionLabels[status]}
    </Badge>
  );
}

export function ScheduleStatusBadge({ status }: { status: PublishingScheduleStatus }) {
  return (
    <Badge className={
      status === 'Active' ? 'bg-green-100 text-green-700 border-green-200' :
      status === 'Paused' ? 'bg-amber-100 text-amber-700 border-amber-200' :
      'bg-gray-100 text-gray-700 border-gray-200'
    }>
      {status === 'Active' ? 'Đang Chạy' : status === 'Paused' ? 'Tạm Dừng' : 'Đã Hủy'}
    </Badge>
  );
}

export function RankingStatusBadge({ status }: { status: 'At Risk' | 'Stable' | 'Rising' }) {
  return (
    <Badge className={
      status === 'At Risk' ? 'bg-red-100 text-red-700 border-red-200' :
      status === 'Stable' ? 'bg-gray-100 text-gray-700 border-gray-200' :
      'bg-green-100 text-green-700 border-green-200'
    }>
      {status === 'At Risk' ? 'Nguy Hiểm' : status === 'Stable' ? 'Ổn Định' : 'Tăng Trưởng'}
    </Badge>
  );
}

export function PublishingTypeBadge({ type }: { type: 'Weekly' | 'Monthly' }) {
  return (
    <Badge className={
      type === 'Weekly'
        ? 'bg-[#D72638]/10 text-[#D72638] border-[#D72638]/20'
        : 'bg-[#4B3F72]/10 text-[#4B3F72] border-[#4B3F72]/20'
    }>
      {type === 'Weekly' ? 'Hàng Tuần' : 'Hàng Tháng'}
    </Badge>
  );
}
