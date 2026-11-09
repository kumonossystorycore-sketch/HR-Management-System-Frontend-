export type PayrollStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'PAID';
export type PayrollItemType = 'ALLOWANCE' | 'OVERTIME' | 'DEDUCTION';
export const ITEM_TYPES: PayrollItemType[] = ['ALLOWANCE', 'OVERTIME', 'DEDUCTION'];
export const PAYROLL_TONE = { DRAFT: 'neutral', PENDING: 'warning', APPROVED: 'info', PAID: 'success', MIXED: 'neutral' } as const;

interface Person {
  id: string;
  email: string;
  employee: { firstName: string; lastName: string } | null;
}

/** One employee's pay for one month (GET /payroll, /payroll/:id, /payslips/…). Money is a decimal string. */
export interface Payroll {
  id: string;
  periodYear: number;
  periodMonth: number;
  basicSalary: string;
  totalAllowances: string;
  totalOvertime: string;
  totalDeductions: string;
  netSalary: string;
  currency: string;
  status: PayrollStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  employee: { id: string; employeeCode: string; firstName: string; lastName: string; department: { id: string; name: string }; position: { id: string; title: string } };
  submittedBy: Person | null;
  approvedBy: Person | null;
  items: Array<{ id: string; type: PayrollItemType; label: string; hours: string | null; amount: string }>;
}

/** GET /payroll/periods */
export interface PayrollPeriod {
  periodYear: number;
  periodMonth: number;
  employees: number;
  totalNet: string;
  byStatus: Partial<Record<PayrollStatus, number>>;
  status: PayrollStatus | 'MIXED';
}

export type Step = 'submit' | 'return' | 'approve' | 'markPaid';
/** Each step: the URL segment, the permission, and the status it starts from. */
export const STEPS: Record<Step, { path: string; permission: string; from: PayrollStatus }> = {
  submit: { path: 'submit', permission: 'payroll:submit', from: 'DRAFT' },
  return: { path: 'return', permission: 'payroll:approve', from: 'PENDING' },
  approve: { path: 'approve', permission: 'payroll:approve', from: 'PENDING' },
  markPaid: { path: 'mark-paid', permission: 'payroll:mark_paid', from: 'APPROVED' },
};
