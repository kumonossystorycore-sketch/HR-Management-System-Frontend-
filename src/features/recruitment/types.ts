import type { StoredFileSummary } from '@/features/leave/types';

export type VacancyStatus = 'OPEN' | 'CLOSED';
export type ApplicantStatus = 'APPLIED' | 'REVIEWING' | 'INTERVIEW' | 'ACCEPTED' | 'REJECTED';
export type InterviewResult = 'PENDING' | 'PASSED' | 'FAILED' | 'NO_SHOW';

export const APPLICANT_STATUSES: ApplicantStatus[] = ['APPLIED', 'REVIEWING', 'INTERVIEW', 'ACCEPTED', 'REJECTED'];
/** The pipeline as the API allows it (FR-REC-03). Interviews are reached by scheduling one. */
export const NEXT_STATUS: Record<ApplicantStatus, ApplicantStatus[]> = {
  APPLIED: ['REVIEWING', 'INTERVIEW', 'REJECTED'],
  REVIEWING: ['INTERVIEW', 'REJECTED'],
  INTERVIEW: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['REJECTED'],
  REJECTED: ['REVIEWING'],
};

export const VACANCY_TONE = { OPEN: 'success', CLOSED: 'neutral' } as const;
export const APPLICANT_TONE = { APPLIED: 'info', REVIEWING: 'warning', INTERVIEW: 'teal', ACCEPTED: 'success', REJECTED: 'danger' } as const;
export const RESULT_TONE = { PENDING: 'warning', PASSED: 'success', FAILED: 'danger', NO_SHOW: 'neutral' } as const;

export interface Vacancy {
  id: string;
  title: string;
  description: string | null;
  openings: number;
  status: VacancyStatus;
  closesAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  department: { id: string; code: string; name: string };
  position: { id: string; title: string };
  _count: { applicants: number };
}

export interface Applicant {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  cvUrl: string | null;
  cvFile: StoredFileSummary | null;
  status: ApplicantStatus;
  notes: string | null;
  convertedAt: string | null;
  createdAt: string;
  employee: { id: string; employeeCode: string } | null;
  vacancy: { id: string; title: string; status: VacancyStatus; department: { id: string; name: string }; position: { id: string; title: string } };
  _count: { interviews: number };
}

export interface Interview {
  id: string;
  scheduledAt: string;
  location: string | null;
  result: InterviewResult;
  notes: string | null;
  interviewer: { id: string; employeeCode: string; firstName: string; lastName: string } | null;
  applicant: { id: string; fullName: string; status: ApplicantStatus; vacancy: { id: string; title: string; departmentId: string } };
}
