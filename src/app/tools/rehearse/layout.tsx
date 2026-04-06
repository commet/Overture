import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '사전 검증 — Overture',
  description: '이해관계자 반응을 시뮬레이션합니다.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
