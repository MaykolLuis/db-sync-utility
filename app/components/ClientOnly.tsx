'use client';

import { useState, useEffect, ReactNode } from 'react';

export default function ClientOnly({ children }: { children: ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Render children only on the client side
  return isClient ? children : null;
}
