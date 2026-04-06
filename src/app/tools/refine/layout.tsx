import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '수정 반영 — Overture',
  description: '피드백을 반영하여 수렴합니다.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
