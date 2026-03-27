import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { LayoutShell } from '@/components/layout/LayoutShell';
import { Providers } from '@/components/layout/Providers';
import { Analytics } from '@/components/layout/Analytics';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

export const metadata: Metadata = {
  title: 'Overture — Think before you recast',
  description:
    'Overture — Think before you recast. 악보 해석, 편곡, 리허설, 합주 연습.',
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
