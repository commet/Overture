'use client';

import { Mail } from 'lucide-react';
import { Button } from './Button';
import { composeMailtoLink } from '@/lib/export';

interface EmailButtonProps {
  getSubject: () => string;
  getBody: () => string;
  label?: string;
}

export function EmailButton({ getSubject, getBody, label = '이메일' }: EmailButtonProps) {
  const handleClick = () => {
    window.open(composeMailtoLink(getSubject(), getBody()), '_self');
  };

  return (
    <Button variant="secondary" onClick={handleClick}>
      <Mail size={14} />
      {label}
    </Button>
  );
}
