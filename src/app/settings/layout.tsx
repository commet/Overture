import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '설정 — Overture',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
