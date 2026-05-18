import { Suspense } from 'react';
import DcaPlans from '@/views/DcaPlans';

export default function PlansPage() {
  return (
    <Suspense>
      <DcaPlans />
    </Suspense>
  );
}
