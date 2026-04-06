import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '실행 설계 — Overture',
  description: '구조와 역할을 설계합니다.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
