import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/lib/auth-context'
import { ThemeProvider } from 'next-themes'
import { TooltipProvider } from '@/components/ui/tooltip'
import dynamic from 'next/dynamic'

const inter = Inter({ subsets: ['latin'] })

// Dynamically import the TitleBarLoader component to avoid SSR issues
const TitleBarLoader = dynamic(
  () => import('./components/TitleBarLoader'),
  { ssr: false }
)

export const metadata: Metadata = {
  title: 'DB Sync Utility',
  description: 'Database synchronization utility application',
}

// Using suppressHydrationWarning for Electron compatibility

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <TooltipProvider>
            <div className="min-h-screen bg-background font-sans antialiased">
              {/* TitleBarLoader will handle rendering the title bar in Electron */}
              <TitleBarLoader />
              <AuthProvider>
                {children}
              </AuthProvider>
            </div>
            <Toaster 
              position="top-right" 
              closeButton 
              theme="dark" 
              toastOptions={{
                style: { 
                  background: '#121212', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e5e5e5',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
                },
                className: 'backdrop-blur-sm'
              }}
            />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
