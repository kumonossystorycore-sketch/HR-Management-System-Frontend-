export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export const LEAVE_STATUSES: LeaveStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
export const LEAVE_TONE = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger', CANCELLED: 'neutral' } as const;

/** GET /leave-types */
export interface LeaveType {
  id: string;
  code: string;
  nameLo: string;
  nameEn: string;
  annualDays: string;
  isPaid: boolean;
  requiresDocument: boolean;
  deductsBalance: boolean;
  isActive: boolean;
}

/** GET /leave-balances(/me) */
export interface LeaveBalance {
  id: string;
  year: number;
  entitledDays: string;
  carriedDays: string;
  usedDays: string;
  remainingDays: string;
  leaveType: { id: string; code: string; nameLo: string; nameEn: string };
}

export interface StoredFileSummary {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

/** A row of GET /leave-requests */
export interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  days: string;
  reason: string;
  documentFile: StoredFileSummary | null;
  status: LeaveStatus;
  decidedAt: string | null;
  decisionNote: string | null;
  cancelledAt: string | null;
  createdAt: string;
  leaveType: { id: string; code: string; nameLo: string; nameEn: string; isPaid: boolean; deductsBalance: boolean };
  employee: { id: string; employeeCode: string; firstName: string; lastName: string; department: { id: string; name: string; managerId: string | null } };
  decidedBy: { id: string; email: string; employee: { firstName: string; lastName: string } | null } | null;
}

export const typeName = (t: { nameLo: string; nameEn: string }, locale: string) => (locale === 'lo' ? t.nameLo : t.nameEn);
export const personName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`;
