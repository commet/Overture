import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: 'Overture — Think before you orchestrate',
  description:
    'AI 오케스트레이션 이전의 판단을 구조화하는 사고 도구. 과제 분해, 산출물 합성, 워크플로우 설계, 페르소나 피드백.',
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
            <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-5xl mx-auto w-full animate-fade-in">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
