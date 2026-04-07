'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { clearAllStorage, STORAGE_KEYS, getStorage } from '@/lib/storage';
import { downloadJson } from '@/lib/export';
import { deleteAllUserData } from '@/lib/db';
import type { LLMMode, LLMProvider } from '@/stores/types';
import { Key, Download, Upload, Trash2, Eye, EyeOff, Server, Cpu, Globe, Check, Volume2, TrendingUp, Brain, MessageSquare, Unlink, Zap } from 'lucide-react';
import { assessLearningHealth } from '@/lib/learning-health';
import { playTransitionTone, resumeAudioContext, startAmbient, stopAmbient, isAmbientPlaying } from '@/lib/audio';
import { useSlackStore } from '@/stores/useSlackStore';

const llmProviders: { value: LLMProvider; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'anthropic',
    label: 'Anthropic (Claude)',
    description: 'Claude Sonnet 4 — 프록시 또는 직접 API 키',
    icon: <Server size={16} />,
  },
  {
    value: 'openai',
    label: 'OpenAI (GPT-4o)',
    description: '본인의 OpenAI API 키 사용. 사용량 제한 없음.',
    icon: <Zap size={16} />,
  },
];

const llmModes: { value: LLMMode; label: string; description: string; icon: React.ReactNode; available: boolean }[] = [
  {
    value: 'proxy',
    label: '서버 프록시 (권장)',
    description: 'API 키 없이 바로 사용. 일일 사용량 제한 있음.',
    icon: <Globe size={16} />,
    available: true,
  },
  {
    value: 'direct',
    label: '직접 API 키',
    description: '본인의 Anthropic API 키 사용. 사용량 제한 없음.',
    icon: <Key size={16} />,
    available: true,
  },
  {
    value: 'local',
    label: '로컬 모델 (Ollama)',
    description: '로컬 LLM 엔드포인트에 연결. 완전한 프라이버시.',
    icon: <Cpu size={16} />,
    available: false,
  },
];

export default function SettingsPage() {
  const { settings, loadSettings, updateSettings } = useSettingsStore();
  const [showKey, setShowKey] = useState(false);
  const [resetModal, setResetModal] = useState(false);

  // Slack
  const slackConnections = useSlackStore(s => s.connections);
  const loadSlack = useSlackStore(s => s.loadConnections);
  const disconnectSlack = useSlackStore(s => s.disconnect);
  const [slackStatus, setSlackStatus] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    loadSlack();
    // Check for Slack OAuth callback status
    const params = new URLSearchParams(window.location.search);
    const slack = params.get('slack');
    if (slack === 'connected') {
      setSlackStatus('connected');
      loadSlack();
      window.history.replaceState({}, '', '/settings');
    } else if (slack === 'error') {
      setSlackStatus('error');
      window.history.replaceState({}, '', '/settings');
    }
  }, [loadSettings, loadSlack]);

  const handleExport = () => {
    const data: Record<string, unknown> = {};
    for (const [name, key] of Object.entries(STORAGE_KEYS)) {
      if (name === 'SETTINGS') continue;
      data[key] = getStorage(key, null);
    }
    downloadJson(data, `sot-backup-${new Date().toISOString().split('T')[0]}.json`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX_IMPORT_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_IMPORT_SIZE) {
      alert('파일 크기가 10MB를 초과합니다. 올바른 백업 파일인지 확인해주세요.');
      return;
    }
    const allowedKeys: Set<string> = new Set(Object.values(STORAGE_KEYS).filter(k => k !== 'sot_settings'));
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        let imported = 0;
        for (const [key, value] of Object.entries(data)) {
          if (allowedKeys.has(key) && typeof value !== 'undefined') {
            localStorage.setItem(key, JSON.stringify(value));
            imported++;
          }
        }
        if (imported === 0) {
          alert('가져올 수 있는 데이터가 없습니다. 올바른 백업 파일인지 확인해주세요.');
          return;
        }
        alert('데이터를 성공적으로 가져왔습니다. 페이지를 새로고침합니다.');
        window.location.reload();
      } catch {
        alert('올바른 JSON 파일이 아닙니다.');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = async () => {
    clearAllStorage();
    await deleteAllUserData();
    setResetModal(false);
    alert('모든 데이터가 초기화되었습니다. 페이지를 새로고침합니다.');
    window.location.reload();
  };

  const handleProviderChange = (provider: LLMProvider) => {
    if (provider === 'openai') {
      // OpenAI always uses direct mode
      updateSettings({ llm_provider: provider, llm_mode: 'direct' });
    } else {
      updateSettings({ llm_provider: provider });
    }
  };

  const handleModeChange = (mode: LLMMode) => {
    if (mode === 'local') return;
    updateSettings({ llm_mode: mode });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold text-[var(--text-primary)]">설정</h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">LLM 연결 방식과 데이터 관리</p>
      </div>

      {/* LLM Provider */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Server size={16} className="text-[var(--accent)]" />
          <h3 className="text-[15px] font-bold">LLM 프로바이더</h3>
        </div>
        <div className="space-y-2">
          {llmProviders.map((provider) => (
            <button
              key={provider.value}
              onClick={() => handleProviderChange(provider.value)}
              className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                (settings.llm_provider || 'anthropic') === provider.value
                  ? 'border-[var(--accent)] bg-[var(--ai)]'
                  : 'border-[var(--border)] hover:border-[var(--accent)]'
              }`}
            >
              <div className={`mt-0.5 ${(settings.llm_provider || 'anthropic') === provider.value ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}>
                {provider.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-[var(--text-primary)]">{provider.label}</span>
                  {(settings.llm_provider || 'anthropic') === provider.value && <Check size={14} className="text-[var(--accent)]" />}
                </div>
                <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">{provider.description}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Anthropic Connection Mode (shown when anthropic provider) */}
      {(settings.llm_provider || 'anthropic') === 'anthropic' && (
        <Card className="animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={16} className="text-[var(--accent)]" />
            <h3 className="text-[15px] font-bold">Anthropic 연결 방식</h3>
          </div>
          <div className="space-y-2">
            {llmModes.map((mode) => (
              <button
                key={mode.value}
                onClick={() => handleModeChange(mode.value)}
                disabled={!mode.available}
                className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  settings.llm_mode === mode.value
                    ? 'border-[var(--accent)] bg-[var(--ai)]'
                    : mode.available
                    ? 'border-[var(--border)] hover:border-[var(--accent)]'
                    : 'border-[var(--border)] opacity-50 cursor-not-allowed'
                }`}
              >
                <div className={`mt-0.5 ${settings.llm_mode === mode.value ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}>
                  {mode.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-[var(--text-primary)]">{mode.label}</span>
                    {settings.llm_mode === mode.value && <Check size={14} className="text-[var(--accent)]" />}
                    {!mode.available && <Badge variant="default">Coming soon</Badge>}
                  </div>
                  <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">{mode.description}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Anthropic API Key (shown when anthropic + direct mode) */}
      {(settings.llm_provider || 'anthropic') === 'anthropic' && settings.llm_mode === 'direct' && (
        <Card className="animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Key size={16} className="text-[var(--accent)]" />
            <h3 className="text-[15px] font-bold">Anthropic API Key</h3>
          </div>
          <div className="text-[12px] text-[var(--text-secondary)] mb-3 space-y-1">
            <p>키는 브라우저 localStorage에 저장되며, LLM 호출 시 같은 서버를 통해 전송됩니다.</p>
            <p className="text-[var(--warning)] font-medium">
              ⚠ 공용 컴퓨터에서는 사용 후 반드시 키를 삭제하세요. 브라우저 확장프로그램이 localStorage에 접근할 수 있습니다.
            </p>
          </div>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={settings.anthropic_api_key}
              onChange={(e) => updateSettings({ anthropic_api_key: e.target.value })}
              placeholder="sk-ant-..."
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              spellCheck={false}
              className="w-full bg-[var(--bg)] border-[1.5px] border-[var(--border)] rounded-[10px] px-3.5 py-2.5 text-[14px] font-mono focus:outline-none focus:border-[var(--accent)] pr-10"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] cursor-pointer"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Card>
      )}

      {/* OpenAI API Key (shown when openai provider) */}
      {(settings.llm_provider || 'anthropic') === 'openai' && (
        <Card className="animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Key size={16} className="text-[var(--accent)]" />
            <h3 className="text-[15px] font-bold">OpenAI API Key</h3>
          </div>
          <div className="text-[12px] text-[var(--text-secondary)] mb-3 space-y-1">
            <p>키는 브라우저 localStorage에 저장되며, LLM 호출 시 같은 서버를 통해 전송됩니다.</p>
            <p className="text-[var(--warning)] font-medium">
              ⚠ 공용 컴퓨터에서는 사용 후 반드시 키를 삭제하세요. 브라우저 확장프로그램이 localStorage에 접근할 수 있습니다.
            </p>
          </div>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={settings.openai_api_key || ''}
              onChange={(e) => updateSettings({ openai_api_key: e.target.value })}
              placeholder="sk-..."
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              spellCheck={false}
              className="w-full bg-[var(--bg)] border-[1.5px] border-[var(--border)] rounded-[10px] px-3.5 py-2.5 text-[14px] font-mono focus:outline-none focus:border-[var(--accent)] pr-10"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] cursor-pointer"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Card>
      )}

      {/* Slack Integration */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={16} className="text-[var(--accent)]" />
          <h3 className="text-[15px] font-bold">Slack 연동</h3>
        </div>
        {slackStatus === 'connected' && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-[var(--collab)] border border-[var(--success)]/20">
            <p className="text-[13px] text-[var(--success)] font-medium flex items-center gap-1.5"><Check size={14} /> Slack에 연결되었습니다!</p>
          </div>
        )}
        {slackStatus === 'error' && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
            <p className="text-[13px] text-red-600 font-medium">Slack 연결에 실패했습니다. 다시 시도해주세요.</p>
          </div>
        )}
        {slackConnections.length > 0 ? (
          <div className="space-y-2">
            {slackConnections.map((conn: { id: string; team_name: string }) => (
              <div key={conn.id} className="flex items-center justify-between p-3 bg-[var(--bg)] rounded-lg">
                <div>
                  <p className="text-[14px] font-medium flex items-center gap-1.5">
                    <Check size={14} className="text-[var(--success)]" /> {conn.team_name}
                  </p>
                  <p className="text-[12px] text-[var(--text-secondary)]">결과를 Slack 채널로 바로 보낼 수 있습니다</p>
                </div>
                <Button variant="danger" size="sm" onClick={() => disconnectSlack(conn.id)}>
                  <Unlink size={14} /> 연결 해제
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-[var(--bg)] rounded-lg">
            <div>
              <p className="text-[14px] font-medium">Slack에 연결하기</p>
              <p className="text-[12px] text-[var(--text-secondary)]">결과를 팀 Slack 채널로 직접 공유</p>
            </div>
            <Button variant="secondary" size="sm" onClick={async () => {
              const { data } = await (await import('@/lib/supabase')).supabase.auth.getSession();
              const token = data.session?.access_token;
              if (token) {
                window.location.href = `/api/slack/oauth?token=${token}`;
              } else {
                window.location.href = '/login?redirect=/settings';
              }
            }}>
              <MessageSquare size={14} /> 연결하기
            </Button>
          </div>
        )}
      </Card>

      {/* Data Management */}
      <Card>
        <h3 className="text-[15px] font-bold mb-4">데이터 관리</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-[var(--bg)] rounded-lg">
            <div>
              <p className="text-[14px] font-medium">데이터 내보내기</p>
              <p className="text-[12px] text-[var(--text-secondary)]">모든 도구 데이터와 페르소나를 JSON으로 다운로드</p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleExport}>
              <Download size={14} /> 내보내기
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-[var(--bg)] rounded-lg">
            <div>
              <p className="text-[14px] font-medium">데이터 가져오기</p>
              <p className="text-[12px] text-[var(--text-secondary)]">JSON 파일에서 데이터 복원</p>
            </div>
            <label className="cursor-pointer">
              <span className="inline-flex items-center justify-center gap-2 rounded-[10px] font-medium transition-all duration-150 active:scale-[0.98] bg-transparent border-[1.5px] border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg)] px-3 py-1.5 text-[13px]">
                <Upload size={14} /> 가져오기
              </span>
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>
          <div className="flex items-center justify-between p-3 bg-[var(--danger)]/10 rounded-lg">
            <div>
              <p className="text-[14px] font-medium text-red-700">데이터 초기화</p>
              <p className="text-[12px] text-red-400">모든 저장된 데이터를 삭제합니다</p>
            </div>
            <Button variant="danger" size="sm" onClick={() => setResetModal(true)}>
              <Trash2 size={14} /> 초기화
            </Button>
          </div>
        </div>
      </Card>

      {/* Language */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Globe size={16} className="text-[var(--accent)]" />
          <h3 className="text-[15px] font-bold">언어 / Language</h3>
        </div>
        <div className="flex gap-2">
          {[
            { value: 'ko' as const, label: '한국어' },
            { value: 'en' as const, label: 'English' },
          ].map((lang) => (
            <button
              key={lang.value}
              onClick={() => { updateSettings({ language: lang.value }); window.location.reload(); }}
              className={`flex-1 py-2.5 rounded-lg text-[13px] font-medium border text-center transition-colors cursor-pointer ${
                settings.language === lang.value
                  ? 'border-[var(--accent)] bg-[var(--ai)] text-[var(--accent)]'
                  : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border)]'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[var(--text-tertiary)] mt-2">
          {settings.language === 'en' ? 'Partial English support. Some UI text may still appear in Korean.' : '일부 UI 텍스트는 아직 한국어로만 제공됩니다.'}
        </p>
      </Card>

      {/* Learning Health */}
      <LearningHealthCard />

      {/* Audio Settings */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Volume2 size={16} className="text-[var(--accent)]" />
          <h3 className="text-[15px] font-bold">사운드</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-medium">전환음</p>
              <p className="text-[12px] text-[var(--text-secondary)]">단계 전환 시 클래식 서곡 톤을 재생합니다</p>
            </div>
            <button
              role="switch"
              aria-checked={settings.audio_enabled}
              onClick={() => {
                const next = !settings.audio_enabled;
                updateSettings({ audio_enabled: next });
                if (next) {
                  resumeAudioContext();
                  playTransitionTone(settings.audio_volume);
                }
              }}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                settings.audio_enabled ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
              }`}
            >
              <span className={`block w-5 h-5 rounded-full bg-[var(--surface)] shadow-sm transition-transform ${
                settings.audio_enabled ? 'translate-x-[22px]' : 'translate-x-[2px]'
              } mt-[2px]`} />
            </button>
          </div>
          {settings.audio_enabled && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-[var(--text-secondary)] w-10 shrink-0">볼륨</span>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.05"
                  value={settings.audio_volume}
                  onChange={(e) => updateSettings({ audio_volume: parseFloat(e.target.value) })}
                  className="flex-1 accent-[var(--accent)]"
                />
                <span className="text-[12px] text-[var(--text-secondary)] w-10 text-right">{Math.round(settings.audio_volume * 200)}%</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                <div>
                  <p className="text-[13px] font-medium">앰비언트 드론</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">공연 전 콘서트홀의 따뜻한 울림</p>
                </div>
                <button
                  onClick={() => {
                    resumeAudioContext();
                    if (isAmbientPlaying()) {
                      stopAmbient();
                    } else {
                      startAmbient(settings.audio_volume);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border cursor-pointer transition-colors ${
                    isAmbientPlaying()
                      ? 'border-[var(--accent)] bg-[var(--ai)] text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]'
                  }`}
                >
                  {isAmbientPlaying() ? '정지' : '재생'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Modal open={resetModal} onClose={() => setResetModal(false)} title="데이터 초기화">
        <p className="text-[14px] text-[var(--text-primary)] mb-4">
          모든 악보 해석, 편곡, 리허설, 합주 연습 이력이 영구 삭제됩니다.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setResetModal(false)}>취소</Button>
          <Button variant="danger" onClick={handleReset}>삭제</Button>
        </div>
      </Modal>
    </div>
  );
}

function LearningHealthCard() {
  const health = useMemo(() => assessLearningHealth(), []);

  if (!health) return null;

  const tierLabels = { 1: '시작', 2: '학습 중', 3: '최적화' };
  const tierColors = { 1: 'text-[var(--text-secondary)]', 2: 'text-[var(--accent)]', 3: 'text-[var(--success)]' };
  const trendIcons = { improving: '↗', stable: '→', not_enough_data: '—' };
  const trendLabels = { improving: '개선 중', stable: '안정', not_enough_data: '데이터 부족' };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Brain size={16} className="text-[var(--accent)]" />
        <h3 className="text-[15px] font-bold">학습 상태</h3>
        <span className={`ml-auto text-[12px] font-bold ${tierColors[health.learning_tier]}`}>
          Tier {health.learning_tier}: {tierLabels[health.learning_tier]}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="text-center p-2 rounded-lg bg-[var(--bg)]">
          <p className="text-[18px] font-bold text-[var(--text-primary)]">{health.signal_count}</p>
          <p className="text-[10px] text-[var(--text-secondary)]">수집된 신호</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-[var(--bg)]">
          <p className="text-[18px] font-bold text-[var(--text-primary)]">{health.eval_coverage}%</p>
          <p className="text-[10px] text-[var(--text-secondary)]">전략 평가율</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-[var(--bg)]">
          <p className="text-[18px] font-bold text-[var(--text-primary)]">{trendIcons[health.override_trend]}</p>
          <p className="text-[10px] text-[var(--text-secondary)]">오버라이드 {trendLabels[health.override_trend]}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-[var(--bg)]">
          <p className="text-[18px] font-bold text-[var(--text-primary)]">{trendIcons[health.convergence_trend]}</p>
          <p className="text-[10px] text-[var(--text-secondary)]">수렴 속도 {trendLabels[health.convergence_trend]}</p>
        </div>
      </div>

      {health.recommendations.length > 0 && (
        <div className="space-y-1">
          {health.recommendations.map((r, i) => (
            <p key={i} className="text-[12px] text-[var(--text-secondary)] flex items-start gap-1.5">
              <TrendingUp size={12} className="text-[var(--accent)] shrink-0 mt-0.5" /> {r}
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}
