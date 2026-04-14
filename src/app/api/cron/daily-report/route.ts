import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const REPORT_EMAIL = process.env.REPORT_EMAIL || '';
const OWNER_EMAILS = (process.env.OWNER_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);

/** Escape HTML special characters to prevent injection in email templates. */
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Constant-time string comparison to prevent timing attacks (Edge-compatible). */
function safeCompare(a: string, b: string): boolean {
  const lengthMismatch = a.length !== b.length ? 1 : 0;
  // Pad to same length to avoid leaking length info via timing
  const compareTarget = lengthMismatch ? a : b;
  let mismatch = lengthMismatch;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ compareTarget.charCodeAt(i);
  }
  return mismatch === 0;
}

// KST = UTC+9
function kstYesterday() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kst.setDate(kst.getDate() - 1);
  return kst.toISOString().split('T')[0]; // YYYY-MM-DD in KST
}

export async function GET(req: Request) {
  // Verify cron secret to prevent unauthorized access (constant-time)
  const authHeader = req.headers.get('authorization') || '';
  const expected = `Bearer ${process.env.CRON_SECRET || ''}`;
  if (!process.env.CRON_SECRET || !safeCompare(authHeader, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const resend = new Resend(process.env.RESEND_API_KEY);

  const yesterday = kstYesterday();
  // KST yesterday 00:00~23:59 → UTC (yesterday-1day) 15:00 ~ yesterday 15:00
  // e.g. KST 3/21 → UTC 3/20 15:00 ~ 3/21 15:00
  const startKST = new Date(`${yesterday}T00:00:00+09:00`);
  const endKST = new Date(`${yesterday}T23:59:59+09:00`);
  const utcStart = startKST.toISOString();
  const utcEnd = endKST.toISOString();

  // ── Queries ──

  // 1. Traffic summary
  const { data: traffic } = await supabase
    .from('user_events')
    .select('session_id, event_name')
    .gte('created_at', utcStart)
    .lt('created_at', utcEnd)
    .limit(10000);

  const sessions = new Set(traffic?.map(e => e.session_id) || []);
  const events = traffic || [];

  // Fallback: just count everything, mark owner data as "includes owner"
  // Since user_events has no user_id, we'll note this in the report

  // 3. Event breakdown
  const eventCounts: Record<string, number> = {};
  const eventSessions: Record<string, Set<string>> = {};
  for (const e of events) {
    eventCounts[e.event_name] = (eventCounts[e.event_name] || 0) + 1;
    if (!eventSessions[e.event_name]) eventSessions[e.event_name] = new Set();
    eventSessions[e.event_name].add(e.session_id);
  }

  // 4. New signups (excluding owner) — direct query via service role
  let newSignups: Array<{ email: string; name: string; created_at: string }> = [];
  try {
    const { data } = await supabase.auth.admin.listUsers();
    newSignups = (data?.users || [])
      .filter(u => {
        const created = new Date(u.created_at);
        return created >= new Date(utcStart) && created < new Date(utcEnd)
          && !OWNER_EMAILS.includes(u.email || '');
      })
      .map(u => ({
        email: u.email || '',
        name: (u.user_metadata?.full_name as string) || '',
        created_at: u.created_at,
      }));
  } catch {
    // auth.admin not available in edge — skip
  }

  // 5. Demo funnel
  const demoEvents = events.filter(e => e.event_name === 'demo_step');
  const demoStepCounts: Record<string, number> = {};
  for (const e of demoEvents) {
    const step = (e as unknown as { properties: { step: number } }).properties?.step;
    if (step !== undefined) {
      demoStepCounts[String(step)] = (demoStepCounts[String(step)] || 0) + 1;
    }
  }

  // 6. Page views
  const pageViews = events.filter(e => e.event_name === 'page_view');
  const pageCounts: Record<string, number> = {};
  for (const e of pageViews) {
    const path = (e as unknown as { properties: { path: string } }).properties?.path || '?';
    pageCounts[path] = (pageCounts[path] || 0) + 1;
  }

  // 7. Stale projects needing outcome recording
  const { data: staleProjects } = await supabase
    .from('refine_loops')
    .select('project_id, user_id, updated_at')
    .in('status', ['converged', 'stopped_by_user'])
    .lt('updated_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

  let staleWithoutOutcome = 0;
  if (staleProjects && staleProjects.length > 0) {
    const projectIds = staleProjects.map(p => p.project_id);
    const { data: existingOutcomes } = await supabase
      .from('outcome_records')
      .select('project_id')
      .in('project_id', projectIds);
    const outcomeProjectIds = new Set((existingOutcomes || []).map(o => o.project_id));
    staleWithoutOutcome = staleProjects.filter(p => !outcomeProjectIds.has(p.project_id)).length;
  }

  // ── Build HTML Report ──

  const kstDate = yesterday;
  const totalSessions = sessions.size;
  const totalEvents = events.length;

  const funnelItems = [
    { label: '악보 해석', key: 'reframe_complete' },
    { label: '편곡', key: 'recast_complete' },
    { label: '리허설', key: 'feedback_complete' },
    { label: '토론', key: 'discussion_complete' },
    { label: '합주 수렴', key: 'loop_converged' },
  ];

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a; background: #fafaf9;">
  <div style="border-bottom: 3px solid #2d4a7c; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="font-size: 20px; margin: 0;">Overture Daily Report</h1>
    <p style="color: #78716c; font-size: 13px; margin: 4px 0 0;">${kstDate} (KST)</p>
  </div>

  <!-- Traffic -->
  <div style="background: white; border: 1px solid #e7e5e4; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
    <h2 style="font-size: 14px; color: #78716c; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.05em;">트래픽</h2>
    <div style="display: flex; gap: 24px;">
      <div>
        <p style="font-size: 32px; font-weight: 800; margin: 0; color: #2d4a7c;">${totalSessions}</p>
        <p style="font-size: 12px; color: #78716c; margin: 2px 0 0;">세션</p>
      </div>
      <div>
        <p style="font-size: 32px; font-weight: 800; margin: 0; color: #a8a29e;">${totalEvents}</p>
        <p style="font-size: 12px; color: #78716c; margin: 2px 0 0;">이벤트</p>
      </div>
    </div>
    <p style="font-size: 11px; color: #a8a29e; margin: 8px 0 0;">* 본인 세션 포함 (세션 ID 기반 분리 미적용)</p>
  </div>

  <!-- Funnel -->
  <div style="background: white; border: 1px solid #e7e5e4; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
    <h2 style="font-size: 14px; color: #78716c; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.05em;">워크플로우 퍼널</h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      ${funnelItems.map(f => {
        const count = eventSessions[f.key]?.size || 0;
        return `<tr>
          <td style="padding: 6px 0; border-bottom: 1px solid #f5f5f4;">${f.label}</td>
          <td style="padding: 6px 0; border-bottom: 1px solid #f5f5f4; text-align: right; font-weight: 700; color: ${count > 0 ? '#2d4a7c' : '#d6d3d1'};">${count}세션</td>
        </tr>`;
      }).join('')}
    </table>
  </div>

  <!-- Demo funnel -->
  <div style="background: white; border: 1px solid #e7e5e4; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
    <h2 style="font-size: 14px; color: #78716c; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.05em;">데모 퍼널</h2>
    <p style="font-size: 13px; margin: 0;">
      시작 → ${demoStepCounts['1'] || 0}
      → ${demoStepCounts['2'] || 0}
      → ${demoStepCounts['3'] || 0}
      → ${demoStepCounts['4'] || 0}
      → 완주 <strong>${demoStepCounts['5'] || 0}</strong>
    </p>
  </div>

  <!-- New signups -->
  <div style="background: white; border: 1px solid #e7e5e4; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
    <h2 style="font-size: 14px; color: #78716c; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.05em;">신규 가입</h2>
    ${newSignups.length > 0
      ? newSignups.map(u => `<p style="font-size: 13px; margin: 4px 0;"><strong>${escHtml(u.name || '(이름 없음)')}</strong> — ${escHtml(u.email)}</p>`).join('')
      : '<p style="font-size: 13px; color: #a8a29e; margin: 0;">신규 가입자 없음</p>'
    }
  </div>

  <!-- Top pages -->
  <div style="background: white; border: 1px solid #e7e5e4; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
    <h2 style="font-size: 14px; color: #78716c; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.05em;">페이지별 조회</h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      ${Object.entries(pageCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8)
        .map(([path, count]) => `<tr>
          <td style="padding: 4px 0; font-family: monospace; font-size: 12px;">${escHtml(path)}</td>
          <td style="padding: 4px 0; text-align: right; font-weight: 600;">${count}</td>
        </tr>`).join('')}
    </table>
  </div>

  <!-- Stale projects -->
  ${staleWithoutOutcome > 0 ? `
  <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
    <h2 style="font-size: 14px; color: #d97706; margin: 0 0 8px;">Outcome 미기록 ${staleWithoutOutcome}건</h2>
    <p style="font-size: 12px; color: #78716c; margin: 0;">2주 이상 지난 완료 프로젝트 중 실행 결과가 기록되지 않은 건수입니다.</p>
  </div>
  ` : ''}

  <!-- Errors -->
  ${eventCounts['error'] ? `
  <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
    <h2 style="font-size: 14px; color: #dc2626; margin: 0 0 8px;">에러 ${eventCounts['error']}건</h2>
    <p style="font-size: 12px; color: #78716c; margin: 0;">Supabase SQL에서 상세 확인하세요.</p>
  </div>
  ` : ''}

  <p style="font-size: 11px; color: #a8a29e; text-align: center; margin-top: 24px;">
    Overture Daily Report — 매일 KST 09:00 자동 발송
  </p>
</body>
</html>
  `.trim();

  // ── Send Email ──
  try {
    await resend.emails.send({
      from: 'Overture <onboarding@resend.dev>',
      to: REPORT_EMAIL,
      subject: `[Overture] ${kstDate} — ${totalSessions}세션, 가입 ${newSignups.length}명`,
      html,
    });

    return NextResponse.json({ ok: true, date: kstDate, sessions: totalSessions, events: totalEvents });
  } catch (err) {
    console.error('[daily-report] email send error:', err);
    return NextResponse.json({ error: 'Failed to send report' }, { status: 500 });
  }
}
