import type { Metadata } from 'next';
import { Suspense } from 'react';
import Goals from '@/views/Goals';

export const metadata: Metadata = { title: 'Goals | DCAlog' };

export default function GoalsPage() {
  return (
    <Suspense>
      <Goals />
    </Suspense>
  );
}
