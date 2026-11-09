'use client';

import { useQuery } from '@tanstack/react-query';
import { http } from './api-client';

export interface DepartmentOption {
  id: string;
  code: string;
  name: string;
}
export interface PositionOption {
  id: string;
  title: string;
  department: { id: string; name: string };
}

/** Departments for filters and forms (the API allows 100 per page, plenty for one company). */
export const useDepartmentOptions = (enabled = true) =>
  useQuery({
    queryKey: ['departments', 'options'],
    queryFn: async () => (await http.get<DepartmentOption[]>('/departments', { params: { pageSize: 100, sort: 'name:asc' } })).data,
    staleTime: 5 * 60_000,
    enabled,
  });

/** Positions, optionally of one department. */
export const usePositionOptions = (departmentId?: string, enabled = true) =>
  useQuery({
    queryKey: ['positions', 'options', departmentId ?? 'all'],
    queryFn: async () => (await http.get<PositionOption[]>('/positions', { params: { pageSize: 100, sort: 'title:asc', ...(departmentId ? { departmentId } : {}) } })).data,
    staleTime: 5 * 60_000,
    enabled,
  });

export interface EmployeeOption {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  employmentStatus: string;
  department: { id: string; name: string };
}

/** Current employees for pickers (interviewer, reviewer). The API allows 100 per page. */
export const useEmployeeOptions = (enabled = true) =>
  useQuery({
    queryKey: ['employees', 'options'],
    queryFn: async () =>
      (await http.get<EmployeeOption[]>('/employees', { params: { pageSize: 100, sort: 'firstName:asc' } })).data.filter((e) => e.employmentStatus === 'ACTIVE' || e.employmentStatus === 'PROBATION'),
    staleTime: 5 * 60_000,
    enabled,
  });
