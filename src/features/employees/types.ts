export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type EmploymentStatus = 'PROBATION' | 'ACTIVE' | 'RESIGNED' | 'TERMINATED';

export const EMPLOYMENT_STATUSES: EmploymentStatus[] = ['PROBATION', 'ACTIVE', 'RESIGNED', 'TERMINATED'];
export const GENDERS: Gender[] = ['MALE', 'FEMALE', 'OTHER'];

/** A row of GET /employees. `basicSalary` is present only for callers allowed to see salaries. */
export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string | null;
  photoFileId: string | null;
  hireDate: string;
  employmentStatus: EmploymentStatus;
  emergencyContactName: string | null;
  emergencyContactRelation: string | null;
  emergencyContactPhone: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  department: { id: string; code: string; name: string };
  position: { id: string; title: string };
  basicSalary?: string;
}

interface PersonRef {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
}

/** GET /employees/:id adds the department manager and a summary of the login account. */
export interface EmployeeDetail extends Omit<Employee, 'department'> {
  department: { id: string; code: string; name: string; manager: PersonRef | null };
  user: { id: string; email: string; isActive: boolean; lastLoginAt: string | null; roles: Array<{ role: { name: string } }> } | null;
}

export interface LeaveBalance {
  id: string;
  year: number;
  entitledDays: string;
  carriedDays: string;
  usedDays: string;
  remainingDays: string;
  leaveType: { id: string; code: string; nameLo: string; nameEn: string };
}

export const fullName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`;

/** Badge colour per status; the badge always shows the word too. */
export const STATUS_TONE = { PROBATION: 'warning', ACTIVE: 'success', RESIGNED: 'neutral', TERMINATED: 'danger' } as const;
