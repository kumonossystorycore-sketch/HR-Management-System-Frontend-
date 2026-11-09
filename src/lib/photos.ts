'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from './api-client';

/**
 * An employee photo as a local blob URL. Photos need the access token (they follow the same
 * access rules as the employee record), so they are fetched through the API client rather
 * than linked. Keyed by file id: a new photo gets a new id, so caches never show an old one.
 */
export const useEmployeePhoto = (employeeId: string | null | undefined, photoFileId: string | null | undefined) =>
  useQuery({
    queryKey: ['photo', photoFileId],
    queryFn: async () => URL.createObjectURL((await api.get<Blob>(`/employees/${employeeId}/photo`, { responseType: 'blob' })).data),
    enabled: Boolean(employeeId && photoFileId),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: false,
  }).data;
