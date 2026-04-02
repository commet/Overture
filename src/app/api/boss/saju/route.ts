import { NextRequest, NextResponse } from 'next/server';
import { interpretSaju } from '@/lib/boss/saju-interpreter';

export async function POST(req: NextRequest) {
  try {
    const { year, month, day, hour, minute, gender } = await req.json();

    if (!year || !month || !day || !gender) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }

    const profile = await interpretSaju({
      year: Number(year),
      month: Number(month),
      day: Number(day),
      hour: hour ? Number(hour) : undefined,
      minute: minute ? Number(minute) : undefined,
      gender,
    });

    return NextResponse.json(profile);
  } catch {
    return NextResponse.json({ error: '사주 분석 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
