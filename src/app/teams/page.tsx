'use client';

import { useEffect, useState } from 'react';
import type { TeamInvite } from '@/stores/types';
import { useTeamStore } from '@/stores/useTeamStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Plus, Users, Mail, Check, X, Crown, Shield, User, Trash2, Copy, ArrowRight } from 'lucide-react';

export default function TeamsPage() {
  const {
    teams, members, invites, currentTeamId,
    loadTeams, createTeam, setCurrentTeam,
    loadMembers, inviteMember, removeMember,
    loadInvites, loadMyInvites, acceptInvite,
  } = useTeamStore();

  const [showCreate, setShowCreate] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [myInvites, setMyInvites] = useState<TeamInvite[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTeams();
    loadMyInvites().then(setMyInvites);
  }, [loadTeams, loadMyInvites]);

  useEffect(() => {
    if (currentTeamId) {
      loadMembers(currentTeamId);
      loadInvites(currentTeamId);
    }
  }, [currentTeamId, loadMembers, loadInvites]);

  const currentTeam = teams.find(t => t.id === currentTeamId);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setCreating(true);
    await createTeam(newTeamName.trim());
    setNewTeamName('');
    setShowCreate(false);
    setCreating(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !currentTeamId) return;
    setInviteLoading(true);
    const ok = await inviteMember(currentTeamId, inviteEmail.trim(), inviteRole);
    setInviteLoading(false);
    if (ok) {
      setInviteSuccess(inviteEmail.trim());
      setInviteEmail('');
      setTimeout(() => setInviteSuccess(''), 3000);
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    const ok = await acceptInvite(inviteId);
    if (ok) {
      setMyInvites(prev => prev.filter(i => i.id !== inviteId));
    }
  };

  const roleIcon = (role: string) => {
    if (role === 'owner') return <Crown size={12} className="text-[var(--gold)]" />;
    if (role === 'admin') return <Shield size={12} className="text-[var(--accent)]" />;
    return <User size={12} className="text-[var(--text-tertiary)]" />;
  };

  const roleLabel = (role: string) => {
    if (role === 'owner') return 'Owner';
    if (role === 'admin') return 'Admin';
    return 'Member';
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-[var(--text-primary)]">팀</h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
          팀원들과 함께 전략적 판단을 내릴 수 있습니다.
        </p>
      </div>

      {/* ── 받은 초대 ── */}
      {myInvites.length > 0 && (
        <div className="space-y-2">
          <p className="text-[12px] font-semibold text-[var(--accent)]">받은 초대 {myInvites.length}건</p>
          {myInvites.map((invite) => (
            <div key={invite.id} className="flex items-center justify-between p-3 rounded-xl border border-[var(--accent)] bg-[var(--ai)]">
              <div>
                <p className="text-[13px] font-medium text-[var(--text-primary)]">
                  팀 초대
                </p>
                <p className="text-[12px] text-[var(--text-secondary)]">
                  {invite.role === 'admin' ? 'Admin' : 'Member'}으로 초대됨
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleAcceptInvite(invite.id)}>
                  <Check size={12} /> 수락
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setMyInvites(prev => prev.filter(i => i.id !== invite.id))}>
                  <X size={12} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 팀 목록 ── */}
      <div className="space-y-3">
        {teams.length === 0 && !showCreate ? (
          <Card className="text-center py-16">
            <Users size={28} className="mx-auto text-[var(--text-tertiary)] mb-4" />
            <p className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">아직 팀이 없습니다</p>
            <p className="text-[13px] text-[var(--text-secondary)] max-w-xs mx-auto mb-6">
              팀을 만들면 프로젝트를 공유하고, 팀원들의 구조화된 피드백을 받을 수 있습니다.
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={14} /> 첫 팀 만들기
            </Button>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold text-[var(--text-secondary)]">내 팀</p>
              <Button variant="secondary" size="sm" onClick={() => setShowCreate(true)}>
                <Plus size={12} /> 새 팀
              </Button>
            </div>
            {teams.map((team) => (
              <div
                key={team.id}
                onClick={() => setCurrentTeam(team.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                  currentTeamId === team.id
                    ? 'border-[var(--accent)] bg-[var(--ai)] shadow-sm'
                    : 'border-[var(--border-subtle)] hover:border-[var(--border)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white text-[14px] font-bold">
                      {team.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-[var(--text-primary)]">{team.name}</p>
                      <p className="text-[11px] text-[var(--text-tertiary)]">
                        {team.slug}
                      </p>
                    </div>
                  </div>
                  {currentTeamId === team.id && (
                    <Badge variant="ai">선택됨</Badge>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── 팀 생성 모달 ── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="새 팀 만들기">
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">팀 이름</label>
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="전략기획팀"
              maxLength={50}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>취소</Button>
            <Button onClick={handleCreateTeam} disabled={!newTeamName.trim() || creating}>
              {creating ? '생성 중...' : '팀 만들기'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── 선택된 팀 상세 ── */}
      {currentTeam && (
        <div className="space-y-6 animate-fade-in">
          {/* 멤버 목록 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-[var(--text-primary)]">멤버</p>
              <span className="text-[12px] text-[var(--text-tertiary)]">{members.length}명</span>
            </div>
            <div className="space-y-1.5">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[var(--bg)] flex items-center justify-center">
                      {roleIcon(member.role)}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-[var(--text-primary)]">
                        {member.email || member.user_id.slice(0, 8)}
                      </p>
                      <p className="text-[11px] text-[var(--text-tertiary)]">{roleLabel(member.role)}</p>
                    </div>
                  </div>
                  {member.role !== 'owner' && (
                    <button
                      onClick={() => removeMember(member.id)}
                      className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 초대 */}
          <div>
            <p className="text-[14px] font-bold text-[var(--text-primary)] mb-3">팀원 초대</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
                maxLength={254}
                className="flex-1 px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
                className="px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[13px] text-[var(--text-primary)] focus:outline-none"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <Button onClick={handleInvite} disabled={inviteLoading || !inviteEmail.trim()}>
                <Mail size={14} /> 초대
              </Button>
            </div>
            {inviteSuccess && (
              <p className="text-[12px] text-[var(--success)] mt-2 flex items-center gap-1">
                <Check size={12} /> {inviteSuccess}에게 초대를 보냈습니다
              </p>
            )}
          </div>

          {/* 대기 중인 초대 */}
          {invites.filter(i => i.status === 'pending').length > 0 && (
            <div>
              <p className="text-[12px] font-semibold text-[var(--text-secondary)] mb-2">대기 중인 초대</p>
              <div className="space-y-1.5">
                {invites.filter(i => i.status === 'pending').map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-dashed border-[var(--border)] text-[12px]">
                    <div className="flex items-center gap-2">
                      <Mail size={12} className="text-[var(--text-tertiary)]" />
                      <span className="text-[var(--text-primary)]">{invite.email}</span>
                      <Badge variant="default">{invite.role}</Badge>
                    </div>
                    <span className="text-[var(--text-tertiary)]">대기 중</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
