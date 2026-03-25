'use client';

import { Card } from '@/components/ui/Card';
import { ShieldAlert, Shield, EyeOff } from 'lucide-react';
import { DynamicMark } from '@/components/ui/MusicalElements';
import type { ClassifiedRisk } from '@/stores/types';

interface RiskCardsProps {
  risks: ClassifiedRisk[];
}

export function RiskCards({ risks }: RiskCardsProps) {
  if (!risks || risks.length === 0) return null;

  const critical = risks.filter((r) => r.category === 'critical');
  const manageable = risks.filter((r) => r.category === 'manageable');
  const unspoken = risks.filter((r) => r.category === 'unspoken');

  return (
    <>
      {critical.length > 0 && (
        <Card className="!border-l-4 !border-l-[var(--risk-critical)]">
          <div className="flex items-center gap-2 text-[13px] font-bold text-[#E24B4A] mb-2">
            <ShieldAlert size={14} /> 핵심 위협
            <DynamicMark level="ff" className="text-[11px] ml-auto !text-[#E24B4A]/60" />
          </div>
          <ul className="space-y-1.5">
            {critical.map((r, i) => (
              <li key={i} className="text-[13px] text-[var(--text-primary)]">{r.text}</li>
            ))}
          </ul>
        </Card>
      )}
      {manageable.length > 0 && (
        <Card className="!border-l-4 !border-l-[var(--risk-manageable)]">
          <div className="flex items-center gap-2 text-[13px] font-bold text-[#EF9F27] mb-2">
            <Shield size={14} /> 관리 가능한 우려
            <DynamicMark level="mf" className="text-[11px] ml-auto !text-[#EF9F27]/60" />
          </div>
          <ul className="space-y-1.5">
            {manageable.map((r, i) => (
              <li key={i} className="text-[13px] text-[var(--text-primary)]">{r.text}</li>
            ))}
          </ul>
        </Card>
      )}
      {unspoken.length > 0 && (
        <Card className="!border-l-4 !border-l-[var(--risk-unspoken)]">
          <div className="flex items-center gap-2 text-[13px] font-bold text-[#7F77DD] mb-2">
            <EyeOff size={14} /> 침묵의 리스크
            <DynamicMark level="pp" className="text-[11px] ml-auto !text-[#7F77DD]/60" />
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mb-2">아무도 말하지 않지만 모두가 알고 있는 리스크</p>
          <ul className="space-y-1.5">
            {unspoken.map((r, i) => (
              <li key={i} className="text-[13px] text-[var(--text-primary)]">{r.text}</li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
