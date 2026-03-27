'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { CopyButton } from './CopyButton';
import { EmailButton } from './EmailButton';
import { SlackChannelPicker } from './SlackChannelPicker';
import { Button } from './Button';
import { useSlackStore } from '@/stores/useSlackStore';

interface ShareBarProps {
  getText: () => string;
  getTitle: () => string;
  copyLabel?: string;
}

export function ShareBar({ getText, getTitle, copyLabel = '마크다운 복사' }: ShareBarProps) {
  const [slackOpen, setSlackOpen] = useState(false);
  const isConnected = useSlackStore(s => s.isConnected());

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <CopyButton getText={getText} label={copyLabel} />
        <EmailButton getSubject={getTitle} getBody={getText} />
        {isConnected ? (
          <Button variant="secondary" onClick={() => setSlackOpen(true)}>
            <MessageSquare size={14} />
            Slack
          </Button>
        ) : (
          <a href="/settings" className="text-[12px] text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors px-2">
            Slack 연결 →
          </a>
        )}
      </div>

      <SlackChannelPicker
        open={slackOpen}
        onClose={() => setSlackOpen(false)}
        title={getTitle()}
        content={getText()}
      />
    </>
  );
}
