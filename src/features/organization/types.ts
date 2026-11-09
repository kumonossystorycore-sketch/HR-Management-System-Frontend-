interface PersonRef {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
}

/** A row of GET /departments; counts are of current (not archived) employees and positions. */
export interface Department {
  id: string;
  code: string;
  name: string;
  description: string | null;
  archivedAt: string | null;
  manager: PersonRef | null;
  _count: { employees: number; positions: number };
}

/** A row of GET /positions. */
export interface Position {
  id: string;
  title: string;
  description: string | null;
  archivedAt: string | null;
  department: { id: string; code: string; name: string };
  _count: { employees: number };
}
