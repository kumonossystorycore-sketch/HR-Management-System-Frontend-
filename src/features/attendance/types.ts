export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';
export const ATTENDANCE_STATUSES: AttendanceStatus[] = ['PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'LEAVE'];

/** A row of GET /attendance (and the `record` of /attendance/me/today). */
export interface AttendanceRecord {
  id: string;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  workedMinutes: number | null;
  status: AttendanceStatus;
  isLate: boolean;
  isEarlyLeave: boolean;
  note: string | null;
  leaveRequestId: string | null;
  correctedAt: string | null;
  correctionReason: string | null;
  employee: { id: string; employeeCode: string; firstName: string; lastName: string; department: { id: string; name: string } };
}

/** GET /attendance/me/today. Work times are minutes after midnight, Vientiane time. */
export interface AttendanceToday {
  date: string;
  isWorkingDay: boolean;
  workStart: number;
  workEnd: number;
  breakMinutes: number;
  record: AttendanceRecord | null;
}

export const ATTENDANCE_TONE = { PRESENT: 'success', LATE: 'warning', HALF_DAY: 'warning', ABSENT: 'danger', LEAVE: 'info' } as const;
