import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { LayoutShell } from '@/components/layout/LayoutShell';
import { Providers } from '@/components/layout/Providers';
import { Analytics } from '@/components/layout/Analytics';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

const SITE_URL = 'https://overture-zeta.vercel.app';

export const metadata: Metadata = {
  title: 'Overture — 내 전문 분야가 아닌 걸 해야 할 때',
  description: '질문 하나 던지면, 30초 안에 기획안 뼈대가 나옵니다. 채울수록 날카로워집니다. 인지과학 + 전략기획 실무 기반.',
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: 'Overture — 내 전문 분야가 아닌 걸 해야 할 때',
    description: '질문 하나 던지면, 30초 안에 기획안 뼈대가 나옵니다. 채울수록 날카로워집니다.',
    url: SITE_URL,
    siteName: 'Overture',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Overture — 내 전문 분야가 아닌 걸 해야 할 때',
    description: '질문 하나 던지면, 30초 안에 기획안 뼈대가 나옵니다.',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get('x-nonce') || '';

  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          integrity="sha384-GIdEBaqGN9mNkDkMkzMHW8EKUqtpPIe/sLj1X7DIrnc9uPtLROJgmuDlh+3rBw0j"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&display=swap"
        />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('overture-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.setAttribute('data-theme','dark')}}catch(e){}})()` }} />
      </head>
      <body>
        <Providers>
          <Analytics />
          <ErrorBoundary>
            <div className="min-h-screen flex flex-col">
              <Header />
              <div className="flex flex-1">
                <LayoutShell>
                  {children}
                </LayoutShell>
              </div>
            </div>
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
