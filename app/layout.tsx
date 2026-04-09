import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Cormorant_Garamond } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
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
    <html lang="ko">
      <body className={`bg-black text-white font-sans antialiased ${cormorant.variable}`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
