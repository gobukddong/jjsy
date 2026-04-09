import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'
const cormorant = Cormorant_Garamond({ 
  subsets: ["latin"],
  weight: ['400', '600', '700'],
  variable: '--font-cormorant',
  style: ['italic', 'normal']
});

export const metadata: Metadata = {
  title: '진주와상윤',
  description: '진주와상윤의 전용 비디오 피드',
  icons: {
    icon: '/jjicon.png',
    apple: '/jjicon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />
      </head>
      <body className={`bg-white dark:bg-black text-zinc-900 dark:text-white font-sans antialiased ${cormorant.variable} transition-colors duration-300`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange={false} // 애니메이션 적용을 위해 false 
        >
          {children}
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </ThemeProvider>
      </body>
    </html>
  )
}
