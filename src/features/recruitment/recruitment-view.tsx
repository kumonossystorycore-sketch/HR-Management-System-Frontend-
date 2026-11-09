'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/layout/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useListParams } from '@/hooks/use-list-params';
import { ApplicantsPanel } from './applicants';
import { InterviewsPanel } from './interview-dialogs';
import { RECRUITMENT_KEYS, VacanciesPanel } from './vacancies';

const VIEWS = ['vacancies', 'applicants', 'interviews'] as const;
type View = (typeof VIEWS)[number];

/** FR-REC-01..05: vacancies, applicants and interviews. Managers see their department's hiring. */
export function RecruitmentView() {
  const t = useTranslations('recruitment');
  const tc = useTranslations('common');
  const { values, set } = useListParams(RECRUITMENT_KEYS);
  const view: View = (VIEWS as readonly string[]).includes(values.view) ? (values.view as View) : 'vacancies';
  const panels: Record<View, React.ReactNode> = { vacancies: <VacanciesPanel />, applicants: <ApplicantsPanel />, interviews: <InterviewsPanel /> };
  return (
    <>
      <PageHeader title={t('title')} crumbs={[{ label: tc('home'), href: '/dashboard' }, { label: t('title') }]} />
      <Tabs value={view} onValueChange={(v) => set({ view: v === 'vacancies' ? null : v, search: null, status: null, vacancyId: null, when: null })}>
        <TabsList aria-label={t('title')}>
          {VIEWS.map((v) => (
            <TabsTrigger key={v} value={v}>
              {t(`tabs.${v}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        {VIEWS.map((v) => (
          <TabsContent key={v} value={v}>
            {v === view && panels[v]}
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
