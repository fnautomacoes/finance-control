'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AccountsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the Portuguese version
    router.replace('/contas');
  }, [router]);

  return null;
}
