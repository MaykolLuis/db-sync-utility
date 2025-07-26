import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DB Sync Utility - Login',
  description: 'Database synchronization utility application login',
}

export default function LoginLayout({
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
        <div className="min-h-screen bg-background font-sans antialiased">
          {children}
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
        </div>
      </body>
    </html>
  )
}
