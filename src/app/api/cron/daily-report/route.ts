import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// nodejs runtime — supabase.auth.admin.listUsers() is unreliable on edge,
// and we now need reliable admin access for the owner filter + signup drilldown
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REPORT_EMAIL = process.env.REPORT_EMAIL || '';
const OWNER_EMAILS = (process.env.OWNER_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

// ───── Helpers ─────

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function safeCompare(a: string, b: string): boolean {
  const lengthMismatch = a.length !== b.length ? 1 : 0;
  const compareTarget = lengthMismatch ? a : b;
  let mismatch = lengthMismatch;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ compareTarget.charCodeAt(i);
  return mismatch === 0;
}

function kstDateString(d: Date): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[0];
}

function kstRange(daysAgo: number): { start: string; end: string; label: string } {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kst.setUTCDate(kst.getUTCDate() - daysAgo);
  const label = kst.toISOString().split('T')[0];
  const start = new Date(`${label}T00:00:00+09:00`).toISOString();
  const end = new Date(`${label}T23:59:59.999+09:00`).toISOString();
  return { start, end, label };
}

/** Classify an event's source into a stable bucket for reporting. */
function classifySource(initialReferrer: string | null | undefined, utmSource: string | null | undefined): string {
  if (utmSource) {
    const u = utmSource.toLowerCase();
    if (u.includes('ig') || u.includes('instagram')) return 'Instagram';
    if (u.includes('linkedin')) return 'LinkedIn';
    if (u.includes('threads')) return 'Threads';
    if (u.includes('facebook') || u.includes('fb')) return 'Facebook';
    return utmSource;
  }
  if (!initialReferrer) return 'Direct';
  const host = initialReferrer.replace(/^https?:\/\//, '').replace(/^android-app:\/\//, '').split('/')[0];
  if (host.includes('linkedin')) return 'LinkedIn';
  if (host.includes('threads')) return 'Threads';
  if (host.includes('instagram')) return 'Instagram';
  if (host.includes('facebook') || host === 'm.facebook.com') return 'Facebook';
  if (host.includes('google') || host.includes('bing') || host.includes('duckduckgo')) return 'Search';
  if (host.includes('accounts.google')) return 'Google OAuth';
  if (host.includes('vercel')) return 'Vercel';
  if (host.includes('overture') || host.includes('localhost')) return 'Internal';
  return host;
}

type EventRow = {
  session_id: string;
  event_name: string;
  properties: Record<string, unknown> | null;
  user_id: string | null;
  page_path: string | null;
  referrer: string | null;
  created_at: string;
};

type UserRow = { id: string; email: string | null; created_at: string; user_metadata: Record<string, unknown> | null };

// ───── Handler ─────

export async function GET(req: Request) {
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

  // ─── Time windows ───
  const yesterday = kstRange(1);
  const sevenDaysAgo = kstRange(7);

  // ─── 1. Load all auth users, identify owner IDs ───
  const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const allUsers: UserRow[] = (usersData?.users || []).map(u => ({
    id: u.id,
    email: u.email || null,
    created_at: u.created_at,
    user_metadata: (u.user_metadata as Record<string, unknown>) || null,
  }));
  const ownerIds = new Set(allUsers.filter(u => OWNER_EMAILS.includes((u.email || '').toLowerCase())).map(u => u.id));

  // ─── 2. Fetch events: yesterday (detailed) + last 7 days (rollup) ───
  const { data: yesterdayRaw } = await supabase
    .from('user_events')
    .select('session_id, event_name, properties, user_id, page_path, referrer, created_at')
    .gte('created_at', yesterday.start)
    .lte('created_at', yesterday.end)
    .limit(20000);

  const { data: weekRaw } = await supabase
    .from('user_events')
    .select('session_id, user_id, event_name, created_at')
    .gte('created_at', sevenDaysAgo.start)
    .lte('created_at', yesterday.end)
    .limit(100000);

  const yesterdayEvents: EventRow[] = (yesterdayRaw || []) as EventRow[];
  const weekEvents = (weekRaw || []) as Pick<EventRow, 'session_id' | 'user_id' | 'event_name' | 'created_at'>[];

  // ─── 3. Filter out owner sessions ───
  // A session is "owner" if ANY event in it has user_id in ownerIds
  const ownerSessionIds = new Set<string>();
  for (const e of yesterdayEvents) if (e.user_id && ownerIds.has(e.user_id)) ownerSessionIds.add(e.session_id);
  for (const e of weekEvents) if (e.user_id && ownerIds.has(e.user_id)) ownerSessionIds.add(e.session_id);

  const extYesterday = yesterdayEvents.filter(e => !ownerSessionIds.has(e.session_id));
  const extWeek = weekEvents.filter(e => !ownerSessionIds.has(e.session_id));

  // ─── 4. Yesterday top-line ───
  const sessionsY = new Set(extYesterday.map(e => e.session_id));
  const usersY = new Set(extYesterday.filter(e => e.user_id).map(e => e.user_id!));
  const anonSessionsY = new Set(extYesterday.filter(e => !e.user_id).map(e => e.session_id));

  // ─── 5. Source breakdown (from session_start events) ───
  const sourceBuckets: Record<string, number> = {};
  const sessionStarts = extYesterday.filter(e => e.event_name === 'session_start');
  for (const e of sessionStarts) {
    const props = e.properties || {};
    const src = classifySource(
      (props.initial_referrer as string) || e.referrer,
      props.utm_source as string
    );
    sourceBuckets[src] = (sourceBuckets[src] || 0) + 1;
  }
  // Fallback for sessions that fired events before session_start rollout (backward compat)
  const seenInStart = new Set(sessionStarts.map(e => e.session_id));
  for (const sid of sessionsY) {
    if (seenInStart.has(sid)) continue;
    const first = extYesterday.find(e => e.session_id === sid);
    const src = classifySource(first?.referrer || null, null);
    sourceBuckets[src] = (sourceBuckets[src] || 0) + 1;
  }

  // ─── 6. New signups + per-user activity drilldown ───
  const yesterdayStart = new Date(yesterday.start);
  const yesterdayEnd = new Date(yesterday.end);
  const newSignups = allUsers.filter(u => {
    const created = new Date(u.created_at);
    return created >= yesterdayStart && created <= yesterdayEnd && !OWNER_EMAILS.includes((u.email || '').toLowerCase());
  });

  // Signup drilldown: find all sessions this user touched yesterday, classify source, count milestones
  const MILESTONES = [
    { key: 'reframe_complete', label: 'Reframe' },
    { key: 'recast_complete', label: 'Recast' },
    { key: 'progressive_draft_added', label: '초안' },
    { key: 'progressive_draft_promoted', label: '드래프트 확정' },
    { key: 'feedback_complete', label: '페르소나 피드백' },
    { key: 'flow_done', label: '플로우 완주' },
  ] as const;

  const signupDetails = newSignups.map(u => {
    // Sessions owned by this user (either logged-in events OR anonymous events in same session)
    const userSessionIds = new Set(extYesterday.filter(e => e.user_id === u.id).map(e => e.session_id));
    const userEvents = extYesterday.filter(e => userSessionIds.has(e.session_id));
    const firstEvent = userEvents.length > 0
      ? userEvents.reduce((min, e) => new Date(e.created_at) < new Date(min.created_at) ? e : min, userEvents[0])
      : null;
    const lastEvent = userEvents.length > 0
      ? userEvents.reduce((max, e) => new Date(e.created_at) > new Date(max.created_at) ? e : max, userEvents[0])
      : null;
    const sessionStart = userEvents.find(e => e.event_name === 'session_start');
    const src = classifySource(
      (sessionStart?.properties?.initial_referrer as string) || firstEvent?.referrer || null,
      sessionStart?.properties?.utm_source as string
    );
    const reached = MILESTONES.filter(m => userEvents.some(e => e.event_name === m.key));
    const durationMin = firstEvent && lastEvent
      ? Math.round((new Date(lastEvent.created_at).getTime() - new Date(firstEvent.created_at).getTime()) / 60000)
      : 0;
    return {
      email: u.email || '',
      name: (u.user_metadata?.full_name as string) || '',
      createdAt: u.created_at,
      source: src,
      sessionCount: userSessionIds.size,
      eventCount: userEvents.length,
      reached,
      durationMin,
      lastEventName: lastEvent?.event_name || null,
    };
  });

  // ─── 7. Funnel with conversion % (yesterday, external only) ───
  const funnelStages = [
    { label: '세션 시작', keys: ['session_start', 'page_view'] }, // backward compat: older sessions may lack session_start
    { label: '랜딩 CTA', keys: ['landing_hero_submit', 'landing_cta_click'] },
    { label: 'Workspace 진입', keys: ['workspace_enter', 'workspace_problem_submit'] },
    { label: 'Reframe 완료', keys: ['reframe_complete'] },
    { label: '초안 생성', keys: ['progressive_draft_added', 'recast_complete'] },
    { label: '완주', keys: ['flow_done', 'progressive_draft_promoted', 'loop_converged'] },
  ];
  const funnelCounts = funnelStages.map(stage => {
    const sid = new Set(extYesterday.filter(e => stage.keys.includes(e.event_name)).map(e => e.session_id));
    return { label: stage.label, sessions: sid.size };
  });
  const funnelTop = funnelCounts[0].sessions || 1;

  // ─── 8. 7-day trend (daily session count, external) ───
  const daily: Record<string, Set<string>> = {};
  for (const e of extWeek) {
    const date = kstDateString(new Date(e.created_at));
    if (!daily[date]) daily[date] = new Set();
    daily[date].add(e.session_id);
  }
  const dailyTrend = Object.entries(daily).sort(([a], [b]) => a.localeCompare(b)).map(([d, s]) => ({ date: d, sessions: s.size }));

  // ─── 9. Errors ───
  const errorCount = extYesterday.filter(e => e.event_name === 'error').length;

  // ───── Build HTML ─────

  const kstDate = yesterday.label;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; color: #1a1a1a; background: #fafaf9;">
  <div style="border-bottom: 3px solid #2d4a7c; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="font-size: 20px; margin: 0;">Overture Daily Report</h1>
    <p style="color: #78716c; font-size: 13px; margin: 4px 0 0;">${kstDate} (KST) · 본인 세션 제외</p>
  </div>

  <!-- TOP-LINE -->
  <div style="background: white; border: 1px solid #e7e5e4; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
    <h2 style="font-size: 14px; color: #78716c; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.05em;">어제 트래픽 (외부)</h2>
    <div style="display: flex; gap: 32px; flex-wrap: wrap;">
      <div>
        <p style="font-size: 28px; font-weight: 800; margin: 0; color: #2d4a7c;">${usersY.size}</p>
        <p style="font-size: 12px; color: #78716c; margin: 2px 0 0;">로그인 유저</p>
      </div>
      <div>
        <p style="font-size: 28px; font-weight: 800; margin: 0; color: #4b6a95;">${anonSessionsY.size}</p>
        <p style="font-size: 12px; color: #78716c; margin: 2px 0 0;">익명 방문</p>
      </div>
      <div>
        <p style="font-size: 28px; font-weight: 800; margin: 0; color: #a8a29e;">${sessionsY.size}</p>
        <p style="font-size: 12px; color: #78716c; margin: 2px 0 0;">총 세션</p>
      </div>
      <div>
        <p style="font-size: 28px; font-weight: 800; margin: 0; color: #a8a29e;">${extYesterday.length}</p>
        <p style="font-size: 12px; color: #78716c; margin: 2px 0 0;">이벤트</p>
      </div>
    </div>
    <p style="font-size: 11px; color: #a8a29e; margin: 12px 0 0; line-height: 1.5;">
      <strong>세션</strong> = 브라우저 탭 1개의 수명. 같은 사람이 하루에 2번 접속하면 2세션.<br>
      <strong>로그인 유저</strong> = 어제 이벤트를 발생시킨 고유 가입자 수. 이게 진짜 "몇 명이 썼는가".
    </p>
  </div>

  <!-- NEW SIGNUPS DRILLDOWN -->
  <div style="background: white; border: 1px solid #e7e5e4; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
    <h2 style="font-size: 14px; color: #78716c; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.05em;">신규 가입 · 어제의 여정</h2>
    ${signupDetails.length === 0
      ? '<p style="font-size: 13px; color: #a8a29e; margin: 0;">신규 가입자 없음</p>'
      : signupDetails.map(s => `
      <div style="border-left: 3px solid ${s.reached.length > 0 ? '#2d4a7c' : '#d6d3d1'}; padding: 8px 0 8px 12px; margin-bottom: 12px;">
        <p style="font-size: 14px; font-weight: 700; margin: 0;">${escHtml(s.name || '(이름 없음)')}</p>
        <p style="font-size: 12px; color: #78716c; margin: 2px 0 0;">${escHtml(s.email)} · ${escHtml(s.source)}</p>
        <p style="font-size: 12px; color: #57534e; margin: 6px 0 0;">
          세션 ${s.sessionCount} · 이벤트 ${s.eventCount} · 체류 ${s.durationMin}분
        </p>
        <p style="font-size: 12px; margin: 6px 0 0;">
          ${s.reached.length > 0
            ? s.reached.map(m => `<span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 10px; margin-right: 4px; font-size: 11px;">${escHtml(m.label)}</span>`).join('')
            : '<span style="color: #a8a29e; font-size: 11px;">진입만 — 본격적인 단계 도달 X</span>'
          }
        </p>
        ${s.lastEventName ? `<p style="font-size: 11px; color: #a8a29e; margin: 4px 0 0;">마지막 이벤트: <code>${escHtml(s.lastEventName)}</code></p>` : ''}
      </div>
    `).join('')}
  </div>

  <!-- SOURCE BREAKDOWN -->
  <div style="background: white; border: 1px solid #e7e5e4; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
    <h2 style="font-size: 14px; color: #78716c; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.05em;">유입 소스 (세션 기준)</h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      ${Object.entries(sourceBuckets)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([src, count]) => {
          const pct = sessionsY.size > 0 ? Math.round((count / sessionsY.size) * 100) : 0;
          return `<tr>
            <td style="padding: 6px 0; border-bottom: 1px solid #f5f5f4;">${escHtml(src)}</td>
            <td style="padding: 6px 0; border-bottom: 1px solid #f5f5f4; text-align: right; font-weight: 600;">${count}</td>
            <td style="padding: 6px 0 6px 12px; border-bottom: 1px solid #f5f5f4; text-align: right; color: #78716c; font-size: 11px; width: 48px;">${pct}%</td>
          </tr>`;
        }).join('')}
    </table>
  </div>

  <!-- FUNNEL -->
  <div style="background: white; border: 1px solid #e7e5e4; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
    <h2 style="font-size: 14px; color: #78716c; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.05em;">깔때기 전환 (세션 기준)</h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      ${funnelCounts.map((f, i) => {
        const pct = Math.round((f.sessions / funnelTop) * 100);
        const prevPct = i > 0 ? Math.round((f.sessions / (funnelCounts[i - 1].sessions || 1)) * 100) : 100;
        return `<tr>
          <td style="padding: 6px 0; border-bottom: 1px solid #f5f5f4;">${escHtml(f.label)}</td>
          <td style="padding: 6px 0; border-bottom: 1px solid #f5f5f4; text-align: right; font-weight: 700; color: ${f.sessions > 0 ? '#2d4a7c' : '#d6d3d1'};">${f.sessions}</td>
          <td style="padding: 6px 0 6px 12px; border-bottom: 1px solid #f5f5f4; text-align: right; color: #78716c; font-size: 11px; width: 56px;">${pct}%</td>
          <td style="padding: 6px 0 6px 12px; border-bottom: 1px solid #f5f5f4; text-align: right; color: ${prevPct < 50 && i > 0 ? '#dc2626' : '#a8a29e'}; font-size: 11px; width: 56px;">${i === 0 ? '—' : `↓${prevPct}%`}</td>
        </tr>`;
      }).join('')}
    </table>
    <p style="font-size: 11px; color: #a8a29e; margin: 8px 0 0;">좌측부터 전체 대비 %, 우측은 직전 단계 대비 전환율</p>
  </div>

  <!-- 7-DAY TREND -->
  <div style="background: white; border: 1px solid #e7e5e4; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
    <h2 style="font-size: 14px; color: #78716c; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.05em;">지난 7일 세션 추이</h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      ${dailyTrend.map(d => {
        const max = Math.max(...dailyTrend.map(x => x.sessions), 1);
        const barPct = Math.round((d.sessions / max) * 100);
        return `<tr>
          <td style="padding: 4px 0; font-family: monospace; font-size: 12px; width: 90px;">${d.date}</td>
          <td style="padding: 4px 8px;">
            <div style="background: #e7e5e4; border-radius: 4px; height: 10px;">
              <div style="background: #2d4a7c; border-radius: 4px; height: 10px; width: ${barPct}%;"></div>
            </div>
          </td>
          <td style="padding: 4px 0; text-align: right; font-weight: 600; width: 40px;">${d.sessions}</td>
        </tr>`;
      }).join('')}
    </table>
  </div>

  ${errorCount > 0 ? `
  <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
    <h2 style="font-size: 14px; color: #dc2626; margin: 0 0 8px;">에러 ${errorCount}건</h2>
    <p style="font-size: 12px; color: #78716c; margin: 0;">Supabase SQL에서 <code>event_name='error'</code>로 확인하세요.</p>
  </div>
  ` : ''}

  <p style="font-size: 11px; color: #a8a29e; text-align: center; margin-top: 24px;">
    Overture Daily Report — 매일 KST 09:00 자동 발송
  </p>
</body>
</html>
  `.trim();

  // ───── Send ─────
  try {
    await resend.emails.send({
      from: 'Overture <onboarding@resend.dev>',
      to: REPORT_EMAIL,
      subject: `[Overture] ${kstDate} — 유저 ${usersY.size} · 세션 ${sessionsY.size} · 신규 ${signupDetails.length}`,
      html,
    });
    return NextResponse.json({
      ok: true,
      date: kstDate,
      users: usersY.size,
      sessions: sessionsY.size,
      signups: signupDetails.length,
      owner_sessions_excluded: ownerSessionIds.size,
    });
  } catch (err) {
    console.error('[daily-report] email send error:', err);
    return NextResponse.json({ error: 'Failed to send report' }, { status: 500 });
  }
}
