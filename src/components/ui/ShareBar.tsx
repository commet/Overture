'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { CopyButton } from './CopyButton';
import { EmailButton } from './EmailButton';
import { SlackChannelPicker } from './SlackChannelPicker';
import { Button } from './Button';
import { useSlackStore } from '@/stores/useSlackStore';
import { t } from '@/lib/i18n';

interface ShareBarProps {
  getText: () => string;
  getTitle: () => string;
  copyLabel?: string;
}

export function ShareBar({ getText, getTitle, copyLabel }: ShareBarProps) {
  const [slackOpen, setSlackOpen] = useState(false);
  const isConnected = useSlackStore(s => s.isConnected());
  const effectiveCopyLabel = copyLabel ?? t('ui.copyMarkdown');

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <CopyButton getText={getText} label={effectiveCopyLabel} />
        <EmailButton getSubject={getTitle} getBody={getText} />
        {isConnected ? (
          <Button variant="secondary" onClick={() => setSlackOpen(true)}>
            <MessageSquare size={14} />
            Slack
          </Button>
        ) : (
          <a href="/settings" className="text-[12px] text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors px-2">
            {t('ui.connectSlack')}
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
