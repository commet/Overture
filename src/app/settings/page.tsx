'use client';

import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { clearAllStorage, STORAGE_KEYS, getStorage } from '@/lib/storage';
import { downloadJson } from '@/lib/export';
import { deleteAllUserData } from '@/lib/db';
import type { LLMMode } from '@/stores/types';
import { Key, Download, Upload, Trash2, Eye, EyeOff, Server, Cpu, Globe, Check, Volume2 } from 'lucide-react';
import { playTransitionTone, resumeAudioContext, startAmbient, stopAmbient, isAmbientPlaying } from '@/lib/audio';

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

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

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

      {/* LLM Connection Mode */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Server size={16} className="text-[var(--accent)]" />
          <h3 className="text-[15px] font-bold">LLM 연결 방식</h3>
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

      {/* API Key (shown when direct mode) */}
      {settings.llm_mode === 'direct' && (
        <Card className="animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Key size={16} className="text-[var(--accent)]" />
            <h3 className="text-[15px] font-bold">Anthropic API Key</h3>
          </div>
          <p className="text-[12px] text-[var(--text-secondary)] mb-3">
            키는 브라우저에 저장되며, LLM 호출 시 같은 서버를 통해 안전하게 전송됩니다. 외부로 직접 노출되지 않습니다.
          </p>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={settings.anthropic_api_key}
              onChange={(e) => updateSettings({ anthropic_api_key: e.target.value })}
              placeholder="sk-ant-..."
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
