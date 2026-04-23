import { NextRequest, NextResponse } from 'next/server';
import { interpretSaju } from '@/lib/boss/saju-interpreter';
import { validateContentType, validateOrigin } from '@/lib/api-security';

const MAX_BODY = 1024; // 1KB — only needs 6 small fields

export async function POST(req: NextRequest) {
  const ctError = validateContentType(req);
  if (ctError) return ctError;
  const originError = validateOrigin(req);
  if (originError) return originError;

  const cl = Number(req.headers.get('content-length') || 0);
  if (cl > MAX_BODY) {
    return NextResponse.json({ error: 'Request too large.' }, { status: 413 });
  }

  try {
    const { year, month, day, hour, minute, gender } = await req.json();

    if (!year || !month || !gender) {
      return NextResponse.json({ error: 'year, month, and gender are required.' }, { status: 400 });
    }

    const profile = await interpretSaju({
      year: Number(year),
      month: Number(month),
      day: day ? Number(day) : undefined,
      hour: hour ? Number(hour) : undefined,
      minute: minute ? Number(minute) : undefined,
      gender,
    });

    return NextResponse.json(profile);
  } catch {
    return NextResponse.json({ error: 'Saju analysis failed.' }, { status: 500 });
  }
}
