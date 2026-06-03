import { Suspense } from 'react';
import RuleSets from '@/views/RuleSets';

export const metadata = { title: 'Rule Sets | DCAlog' };

export default function RuleSetsPage() {
  return (
    <Suspense>
      <RuleSets />
    </Suspense>
  );
}
