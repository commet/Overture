import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '팀장 시뮬레이터 — 말하기 전에 미리 연습',
  description: '팀장 성격유형과 생년월일을 넣으면, 그 사람이 뭐라 할지 미리 볼 수 있어.',
  openGraph: {
    title: '팀장 시뮬레이터',
    description: '팀장한테 할 말 있어? 미리 시뮬레이션 해봐.',
  },
};

export default function BossLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="boss-layout">
      {children}
    </div>
  );
}
