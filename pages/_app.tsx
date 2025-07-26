import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';

// This custom App component ensures client-side only rendering
function MyApp({ Component, pageProps }: AppProps) {
  // Use this state to prevent server-side rendering
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until client-side
  if (!mounted) {
    return null;
  }

  return <Component {...pageProps} />;
}

export default MyApp;
