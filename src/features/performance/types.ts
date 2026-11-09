export type ReviewStatus = 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED';
export const REVIEW_STATUSES: ReviewStatus[] = ['DRAFT', 'SUBMITTED', 'ACKNOWLEDGED'];
export const REVIEW_TONE = { DRAFT: 'neutral', SUBMITTED: 'warning', ACKNOWLEDGED: 'success' } as const;
export const CRITERIA = ['workQuality', 'communication', 'teamwork', 'responsibility', 'productivity'] as const;
export type Criterion = (typeof CRITERIA)[number];

interface Person {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  departmentId: string;
}

/** GET /reviews(/:id). Scores are 1–5; overallScore is their average (decimal string). */
export interface Review extends Record<Criterion, number | null> {
  id: string;
  periodStart: string;
  periodEnd: string;
  overallScore: string | null;
  comments: string | null;
  employeeFeedback: string | null;
  status: ReviewStatus;
  submittedAt: string | null;
  acknowledgedAt: string | null;
  employee: Person;
  reviewer: Person;
}

export const personName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`;
