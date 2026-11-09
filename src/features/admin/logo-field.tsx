'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageUp, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useErrorMessage } from '@/features/auth/use-messages';
import { api, http } from '@/lib/api-client';
import { uploadFile } from '@/lib/upload';

const TYPES = ['image/png', 'image/jpeg'];
const MAX = 1024 * 1024;

export interface LogoFile {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

/**
 * Module 12: the company logo, saved as soon as it is chosen (it is not part of the form's Save).
 * It is fetched through the API client (it needs the access token) and shown from a blob URL.
 */
export function LogoField({ logoFile, editable }: { logoFile: LogoFile | null; editable: boolean }) {
  const t = useTranslations('settings.company');
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const src = useQuery({
    queryKey: ['settings', 'logo', logoFile?.id],
    queryFn: async () => URL.createObjectURL((await api.get<Blob>('/settings/logo', { responseType: 'blob' })).data),
    enabled: Boolean(logoFile),
    staleTime: Infinity,
    retry: false,
  }).data;

  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await action();
      await qc.invalidateQueries({ queryKey: ['settings'] });
      toast.success(done);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const onPick = (file: File | undefined) => {
    if (input.current) input.current.value = '';
    if (!file) return;
    if (!TYPES.includes(file.type)) return void toast.error(t('logoWrongType'));
    if (file.size > MAX) return void toast.error(t('logoTooLarge'));
    void run(() => uploadFile('put', '/settings/logo', file), t('logoSaved'));
  };

  return (
    <div className="flex flex-col gap-2 md:col-span-2">
      <span className="text-label">{t('logo')}</span>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card p-2">
          {logoFile && src ? (
            // eslint-disable-next-line @next/next/no-img-element -- a blob URL from the API; next/image cannot optimise it
            <img src={src} alt={t('logoAlt')} className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-center text-caption text-muted-foreground">{t('noLogo')}</span>
          )}
        </div>
        {editable && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" loading={busy} onClick={() => input.current?.click()}>
                <ImageUp aria-hidden="true" />
                {logoFile ? t('changeLogo') : t('uploadLogo')}
              </Button>
              {logoFile && (
                <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void run(() => http.delete('/settings/logo'), t('logoRemoved'))}>
                  <Trash2 aria-hidden="true" />
                  {t('removeLogo')}
                </Button>
              )}
            </div>
            <input ref={input} type="file" accept={TYPES.join(',')} className="sr-only" tabIndex={-1} aria-label={t('logo')} onChange={(e) => onPick(e.target.files?.[0])} />
          </div>
        )}
      </div>
      <p className="text-caption text-muted-foreground">{t('logoHint')}</p>
    </div>
  );
}
