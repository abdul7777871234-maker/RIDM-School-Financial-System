'use client';

import { useEffect } from 'react';
import { seedConvexIfNeeded } from '../lib/localDb';

export function SeedProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    seedConvexIfNeeded();
  }, []);

  return <>{children}</>;
}
