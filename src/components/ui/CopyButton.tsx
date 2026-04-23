'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from './Button';
import { copyToClipboard } from '@/lib/export';
import { useLocale } from '@/hooks/useLocale';

interface CopyButtonProps {
  getText: () => string;
  label?: string;
}

export function CopyButton({ getText, label }: CopyButtonProps) {
  const locale = useLocale();
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  const resolvedLabel = label ?? L('결과 복사', 'Copy result');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyToClipboard(getText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <Button
      variant={copied ? 'secondary' : 'primary'}
      onClick={handleCopy}
      className={copied ? '!border-[var(--success)] !text-[var(--success)]' : ''}
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? L('복사 완료!', 'Copied!') : resolvedLabel}
    </Button>
  );
}
