import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '워크스페이스 — Overture',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
