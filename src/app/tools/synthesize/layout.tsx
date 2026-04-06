import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '종합 — Overture',
  description: '다중 관점을 통합하여 최종 판단을 내립니다.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
