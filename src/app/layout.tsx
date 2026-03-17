import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { LayoutShell } from '@/components/layout/LayoutShell';

export const metadata: Metadata = {
  title: 'Overture — Think before you orchestrate',
  description:
    'AI 오케스트레이션 이전의 판단을 구조화하는 사고 도구. 주제 파악, 역할 편성, 조율, 리허설.',
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
            <Sidebar />
            <LayoutShell>
              {children}
            </LayoutShell>
          </div>
        </div>
      </body>
    </html>
  );
}
