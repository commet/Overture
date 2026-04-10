/**
 * Agent Registry — 교차 검증 테스트
 *
 * 4개 소스(BUILTIN_AGENTS, AGENT_CAPABILITIES, AGENT_SKILLS, AGENT_REGISTRY)의
 * 에이전트 ID가 모두 일관되는지 검증.
 */

import { describe, it, expect } from 'vitest';
import {
  AGENT_REGISTRY,
  agentIdToPersonaId,
  agentIdToFrameworkKey,
  personaIdToAgentId,
  isRegisteredAgent,
  getAllAgentIds,
} from '@/lib/agent-registry';
import { AGENT_CAPABILITIES } from '@/lib/agent-capabilities';
import { AGENT_SKILLS } from '@/lib/agent-skills-data';
import { getSkillSet } from '@/lib/agent-skills';
import { assignFramework } from '@/lib/orchestrator-framework';
import type { InputClassification } from '@/lib/orchestrator-classify';

describe('Agent Registry', () => {

  // ── 기본 무결성 ──

  it('should have no duplicate agentIds', () => {
    const ids = AGENT_REGISTRY.map(a => a.agentId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have no duplicate personaIds', () => {
    const ids = AGENT_REGISTRY.map(a => a.personaId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have exactly 17 agents', () => {
    expect(AGENT_REGISTRY.length).toBe(17);
  });

  // ── 양방향 매핑 일관성 ──

  it('agentIdToPersonaId → personaIdToAgentId roundtrip', () => {
    for (const entry of AGENT_REGISTRY) {
      const persona = agentIdToPersonaId(entry.agentId);
      expect(persona).toBe(entry.personaId);
      const back = personaIdToAgentId(persona);
      expect(back).toBe(entry.agentId);
    }
  });

  it('agentIdToFrameworkKey returns correct key', () => {
    expect(agentIdToFrameworkKey('hyeyeon')).toBe('finance');
    expect(agentIdToFrameworkKey('minseo')).toBe('marketing');
    expect(agentIdToFrameworkKey('sujin_hr')).toBe('people_culture');
    expect(agentIdToFrameworkKey('sujin')).toBe('researcher');
  });

  it('unknown agentId falls back to itself', () => {
    expect(agentIdToPersonaId('unknown_agent')).toBe('unknown_agent');
    expect(agentIdToFrameworkKey('unknown_agent')).toBe('unknown_agent');
    expect(isRegisteredAgent('unknown_agent')).toBe(false);
  });

  // ── AGENT_CAPABILITIES 교차 검증 ──

  it('every AGENT_CAPABILITIES entry should be in registry', () => {
    for (const cap of AGENT_CAPABILITIES) {
      expect(isRegisteredAgent(cap.agentId)).toBe(true);
    }
  });

  // ── AGENT_SKILLS 교차 검증 ──

  it('every AGENT_SKILLS personaId should map to a registry entry', () => {
    for (const skill of AGENT_SKILLS) {
      const agentId = personaIdToAgentId(skill.personaId);
      expect(isRegisteredAgent(agentId)).toBe(true);
    }
  });

  // ── getSkillSet 통합 검증 (agent-skills.ts가 registry를 사용) ──

  it('getSkillSet should work with agentId (canonical)', () => {
    expect(getSkillSet('sujin')).toBeDefined();
    expect(getSkillSet('sujin')?.personaId).toBe('researcher');
  });

  it('getSkillSet should work with personaId (legacy)', () => {
    expect(getSkillSet('researcher')).toBeDefined();
    expect(getSkillSet('researcher')?.personaId).toBe('researcher');
  });

  it('getSkillSet should work for previously-missing agents', () => {
    // hyeyeon, minseo, sujin_hr were missing from AGENT_ID_TO_PERSONA
    expect(getSkillSet('hyeyeon')).toBeDefined();
    expect(getSkillSet('hyeyeon')?.personaId).toBe('finance');
    expect(getSkillSet('minseo')).toBeDefined();
    expect(getSkillSet('minseo')?.personaId).toBe('marketing');
    expect(getSkillSet('sujin_hr')).toBeDefined();
    expect(getSkillSet('sujin_hr')?.personaId).toBe('people_culture');
  });

  // ── assignFramework 통합 검증 (orchestrator-framework.ts가 registry를 사용) ──

  it('assignFramework should return correct framework for hyeyeon (was broken)', () => {
    const classification: InputClassification = {
      stakes: 'important',
      domains: ['finance'],
      decisionType: 'needs_analysis',
      agentCount: 2,
    };
    const fw = assignFramework('hyeyeon', '투자 밸류에이션 분석이 필요합니다', classification);
    expect(fw).toBeDefined();
    // finance:needs_analysis → 'Valuation Triangulation' 우선
    expect(fw!.toLowerCase()).toContain('valuation');
  });

  it('assignFramework should return correct framework for minseo (was broken)', () => {
    const classification: InputClassification = {
      stakes: 'important',
      domains: ['marketing'],
      decisionType: 'needs_analysis',
      agentCount: 2,
    };
    const fw = assignFramework('minseo', '마케팅 채널 전략 수립', classification);
    expect(fw).toBeDefined();
    // marketing:needs_analysis → 'Growth Loops' 우선
    expect(fw!.toLowerCase()).toContain('growth');
  });

  it('assignFramework should return correct framework for sujin_hr (was broken)', () => {
    const classification: InputClassification = {
      stakes: 'important',
      domains: ['hr'],
      decisionType: 'needs_analysis',
      agentCount: 2,
    };
    const fw = assignFramework('sujin_hr', '조직 구조 설계', classification);
    expect(fw).toBeDefined();
    // people_culture:needs_analysis → 'Team Topologies' 우선
    expect(fw!.toLowerCase()).toContain('team topolog');
  });

  // ── getAllAgentIds ──

  it('getAllAgentIds returns 17 unique IDs', () => {
    const ids = getAllAgentIds();
    expect(ids.length).toBe(17);
    expect(new Set(ids).size).toBe(17);
  });
});
