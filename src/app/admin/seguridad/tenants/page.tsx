import { Suspense } from 'react';
import TenantsClient from './tenants-client';

async function fetchTenants() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/admin/tenants`, { cache: 'no-store' });
  const data = await res.json();
  return data?.data ?? [];
}

export default async function TenantsPage() {
  const tenants = await fetchTenants();
  return (
    <Suspense>
      <TenantsClient initialTenants={tenants} />
    </Suspense>
  );
}


