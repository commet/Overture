import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '문제 재정의 — Overture',
  description: '숨겨진 전제를 발견하고 문제를 재정의합니다.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
