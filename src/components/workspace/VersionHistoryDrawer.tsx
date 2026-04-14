'use client';

import { useMemo } from 'react';
import type { RefineLoop, RefineIteration } from '@/stores/types';
import { Button } from '@/components/ui/Button';
import { GitBranch, Check, Crown, X, Eye } from 'lucide-react';
import { isPreRelease } from '@/lib/version-numbering';

interface VersionHistoryDrawerProps {
  loop: RefineLoop;
  activePathIds: Set<string>;
  previewIterationId: string | null;
  onClose: () => void;
  onPreview: (iterationId: string) => void;
  onBranch: (iterationId: string) => void;
  onPromote: (iterationId: string) => void;
}

interface TreeNode {
  iter: RefineIteration;
  children: TreeNode[];
}

function buildTree(iterations: RefineIteration[]): TreeNode[] {
  const nodes = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  for (const it of iterations) {
    if (!it.id) continue;
    nodes.set(it.id, { iter: it, children: [] });
  }
  for (const it of iterations) {
    if (!it.id) continue;
    const node = nodes.get(it.id)!;
    const parentId = it.parent_iteration_id;
    if (!parentId) {
      roots.push(node);
    } else {
      const parent = nodes.get(parentId);
      if (parent) parent.children.push(node);
      else roots.push(node); // orphaned → treat as root
    }
  }
  // Sort siblings by created_at so older main-line comes first
  const sortRec = (list: TreeNode[]) => {
    list.sort((a, b) => (a.iter.created_at || '').localeCompare(b.iter.created_at || ''));
    list.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function relativeTime(iso: string): string {
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diffMs / 1000);
    if (s < 60) return '방금';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    const d = Math.floor(h / 24);
    return `${d}일 전`;
  } catch {
    return '';
  }
}

export function VersionHistoryDrawer({
  loop,
  activePathIds,
  previewIterationId,
  onClose,
  onPreview,
  onBranch,
  onPromote,
}: VersionHistoryDrawerProps) {
  const tree = useMemo(() => buildTree(loop.iterations), [loop.iterations]);

  const renderNode = (node: TreeNode, depth: number) => {
    const { iter } = node;
    const iterId = iter.id || '';
    const isActivePath = activePathIds.has(iterId);
    const isActiveLeaf = loop.active_iteration_id === iterId;
    const isPreview = previewIterationId === iterId;
    const label = iter.version_label || `#${iter.iteration_number}`;
    const summary = iter.change_summary || iter.issues_to_address?.slice(0, 2).join(', ') || '—';
    // Only the currently-active iteration may be promoted. Prevents users
    // from relabeling multiple nodes in the same tree to "v1.0".
    const canPromote = isPreRelease(label) && isActiveLeaf;

    return (
      <div key={iterId} className="relative">
        <div
          className={[
            'group rounded-lg border px-3 py-2.5 mb-1.5 transition-all',
            isActiveLeaf
              ? 'border-[var(--accent)] bg-[var(--gold-muted)]/40 shadow-[var(--shadow-xs)]'
              : isActivePath
                ? 'border-[var(--accent-light)]/50 bg-[var(--surface)]'
                : 'border-[var(--border)] bg-[var(--surface)]',
            isPreview && 'ring-2 ring-[var(--accent-light)]',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{ marginLeft: `${Math.min(depth, 3) * 12}px` }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">{label}</span>
            {isActiveLeaf && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)] text-white">
                <Check className="w-2.5 h-2.5" /> 현재
              </span>
            )}
            {!isPreRelease(label) && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                <Crown className="w-2.5 h-2.5" /> released
              </span>
            )}
            <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">
              {iter.created_at ? relativeTime(iter.created_at) : ''}
            </span>
          </div>
          <p
            className="text-[12px] text-[var(--text-secondary)] leading-snug line-clamp-2 mb-2 cursor-pointer hover:text-[var(--text-primary)]"
            onClick={() => onPreview(iterId)}
            title="클릭하면 이 버전의 본문을 미리 봅니다"
          >
            {summary}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              className="inline-flex items-center gap-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
              onClick={() => onPreview(iterId)}
            >
              <Eye className="w-3 h-3" /> 보기
            </button>
            {!isActiveLeaf && (
              <button
                className="inline-flex items-center gap-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
                onClick={() => onBranch(iterId)}
              >
                <GitBranch className="w-3 h-3" /> 여기서 분기
              </button>
            )}
            {canPromote && (
              <button
                className="inline-flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-900 transition-colors ml-auto"
                onClick={() => onPromote(iterId)}
                title="이 버전을 v1.0으로 승격합니다"
              >
                <Crown className="w-3 h-3" /> v1으로 승격
              </button>
            )}
          </div>
        </div>
        {node.children.length > 0 && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <div
        className="absolute inset-0 bg-black/10 pointer-events-auto"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 h-full w-[360px] bg-[var(--bg)] border-l border-[var(--border)] shadow-[var(--shadow-lg)] pointer-events-auto flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div>
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">버전 히스토리</h3>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
              클릭으로 돌아가거나 새 분기를 시작하세요
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="닫기">
            <X className="w-4 h-4" />
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {tree.length === 0 ? (
            <div className="text-[12px] text-[var(--text-tertiary)] text-center py-8">
              아직 저장된 버전이 없습니다.
            </div>
          ) : (
            <div>
              <div className="mb-3 pb-2 border-b border-dashed border-[var(--border)]">
                <div className="text-[11px] text-[var(--text-tertiary)] mb-0.5">v0 (초안)</div>
                <div className="text-[12px] text-[var(--text-secondary)] italic">원본 기획안</div>
              </div>
              {tree.map((node) => renderNode(node, 0))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
