'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Camera, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-provider';
import { useErrorMessage } from '@/features/auth/use-messages';
import { http } from '@/lib/api-client';
import { uploadFile } from '@/lib/upload';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX = 2 * 1024 * 1024;

/**
 * The photo with change/remove buttons. `self` uses /employees/me/photo (an employee's own
 * photo); otherwise /employees/:id/photo (HR). The API checks the type from the content.
 */
export function PhotoField({ employeeId, photoFileId, name, self = false }: { employeeId: string; photoFileId: string | null; name: string; self?: boolean }) {
  const t = useTranslations('employees.photo');
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const { user, reload } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const base = self ? '/employees/me/photo' : `/employees/${employeeId}/photo`;

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['employees'] });
    // The header and sidebar show the signed-in user's own photo from their profile.
    if (user?.employee?.id === employeeId) await reload();
  };

  const onPick = async (file: File | undefined) => {
    if (input.current) input.current.value = '';
    if (!file) return;
    if (!TYPES.includes(file.type)) return void toast.error(t('wrongType'));
    if (file.size > MAX) return void toast.error(t('tooLarge'));
    setBusy(true);
    try {
      await uploadFile('put', base, file);
      await refresh();
      toast.success(t('saved'));
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async () => {
    setBusy(true);
    try {
      await http.delete(base);
      await refresh();
      toast.success(t('removed'));
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} employeeId={employeeId} photoFileId={photoFileId} size="lg" />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" loading={busy} onClick={() => input.current?.click()}>
            <Camera aria-hidden="true" />
            {photoFileId ? t('change') : t('upload')}
          </Button>
          {photoFileId && (
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void onRemove()}>
              <Trash2 aria-hidden="true" />
              {t('remove')}
            </Button>
          )}
        </div>
        <p className="text-caption text-muted-foreground">{t('hint')}</p>
        <input
          ref={input}
          type="file"
          accept={TYPES.join(',')}
          className="sr-only"
          tabIndex={-1}
          aria-label={t('label', { name })}
          onChange={(e) => void onPick(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
