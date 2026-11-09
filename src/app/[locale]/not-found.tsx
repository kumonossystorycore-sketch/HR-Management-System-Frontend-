import { FileQuestion } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('common');
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <EmptyState
        icon={FileQuestion}
        title={t('notFoundTitle')}
        description={t('notFoundText')}
        action={
          <Button asChild>
            <Link href="/dashboard">{t('goHome')}</Link>
          </Button>
        }
      />
    </main>
  );
}
