'use client';

import { Mail } from 'lucide-react';
import { Button } from './Button';
import { composeMailtoLink } from '@/lib/export';
import { useLocale } from '@/hooks/useLocale';

interface EmailButtonProps {
  getSubject: () => string;
  getBody: () => string;
  label?: string;
}

export function EmailButton({ getSubject, getBody, label }: EmailButtonProps) {
  const locale = useLocale();
  const resolvedLabel = label ?? (locale === 'ko' ? '이메일' : 'Email');
  const handleClick = () => {
    window.open(composeMailtoLink(getSubject(), getBody()), '_self');
  };

  return (
    <Button variant="secondary" onClick={handleClick}>
      <Mail size={14} />
      {resolvedLabel}
    </Button>
  );
}
