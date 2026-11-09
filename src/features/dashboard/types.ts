import type { Scope } from '../auth/types';

/** GET /dashboard (Phase 4.3, dashboard.service.ts). Decimals arrive as strings. */
export interface DashboardData {
  scope: Scope;
  date: string;
  me: {
    attendanceToday: { status: string; checkInAt: string | null; checkOutAt: string | null; isLate: boolean; workedMinutes: number | null } | null;
    leaveBalances: Array<{ leaveType: { code: string; nameLo: string; nameEn: string }; remainingDays: string }>;
    pendingLeaveRequests: number;
    latestPayslip: { id: string; periodYear: number; periodMonth: number; netSalary: string; currency: string; status: string } | null;
    reviewsToAcknowledge: number;
    reviewsToWrite: number;
  } | null;
  headcount?: {
    current: number;
    byStatus: Record<string, number>;
    byDepartment: Array<{ departmentId: string; name: string; count: number }>;
    newHiresThisMonth: number;
    departments: number;
  };
  attendanceToday?: { isWorkingDay: boolean; byStatus: Record<string, number>; notCheckedIn: number };
  leave?: {
    pendingRequests: number;
    onLeaveToday: Array<{
      id: string;
      endDate: string;
      leaveType: { code: string; nameLo: string; nameEn: string };
      employee: { id: string; employeeCode: string; firstName: string; lastName: string };
    }>;
  };
  recruitment?: { openVacancies: number } | null;
  charts?: {
    attendanceTrend: Array<{ date: string; PRESENT: number; LATE: number; HALF_DAY: number; ABSENT: number; LEAVE: number }>;
    recruitmentByMonth: Array<{ month: string; applications: number; hires: number }> | null;
  };
  payroll?: { periodYear: number; periodMonth: number; currency: string; employees: number; totalNet: string; byStatus: Record<string, number> } | null;
}
