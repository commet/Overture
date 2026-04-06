'use client';

import { useEffect } from 'react';
import { AuthProvider } from '@/lib/auth';
import { UnlockToast } from '@/components/agents/UnlockToast';
import { useAgentStore } from '@/stores/useAgentStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { usePersonaStore } from '@/stores/usePersonaStore';

function StoreInitializer() {
  const loadAgents = useAgentStore(s => s.loadAgents);
  const loadSettings = useSettingsStore(s => s.loadSettings);
  const loadProjects = useProjectStore(s => s.loadProjects);
  const loadPersonas = usePersonaStore(s => s.loadData);

  useEffect(() => {
    loadAgents();
    loadSettings();
    loadProjects();
    loadPersonas();
  }, [loadAgents, loadSettings, loadProjects, loadPersonas]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <StoreInitializer />
      {children}
      <UnlockToast />
    </AuthProvider>
  );
}
