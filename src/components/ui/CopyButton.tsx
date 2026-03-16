'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from './Button';
import { copyToClipboard } from '@/lib/export';

interface CopyButtonProps {
  getText: () => string;
  label?: string;
}

export function CopyButton({ getText, label = '결과 복사' }: CopyButtonProps) {
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
      {copied ? '복사 완료!' : label}
    </Button>
  );
}
