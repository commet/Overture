import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { LayoutShell } from '@/components/layout/LayoutShell';

export const metadata: Metadata = {
  title: 'Overture — Think before you orchestrate',
  description:
    'Overture — Think before you orchestrate. 악보 해석, 편곡, 리허설, 합주 연습.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <div className="min-h-screen flex flex-col">
          <Header />
          <div className="flex flex-1">
            <LayoutShell>
              {children}
            </LayoutShell>
          </div>
        </div>
      </body>
    </html>
  );
}
