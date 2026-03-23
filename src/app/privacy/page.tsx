'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      <Link href="/login" className="inline-flex items-center gap-1 text-[13px] text-[var(--accent)] hover:underline mb-6">
        <ArrowLeft size={14} /> 돌아가기
      </Link>

      <h1 className="text-[24px] font-bold text-[var(--text-primary)] mb-2">개인정보처리방침</h1>
      <p className="text-[13px] text-[var(--text-secondary)] mb-8">최종 수정일: 2026년 3월 23일</p>

      <div className="prose prose-sm max-w-none space-y-6 text-[14px] text-[var(--text-primary)] leading-relaxed">
        <section>
          <h2 className="text-[16px] font-bold mb-2">1. 수집하는 개인정보 항목</h2>
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 pr-4 font-semibold">구분</th>
                <th className="text-left py-2 pr-4 font-semibold">항목</th>
                <th className="text-left py-2 font-semibold">수집 방법</th>
              </tr>
            </thead>
            <tbody className="text-[var(--text-secondary)]">
              <tr className="border-b border-[var(--border-subtle)]">
                <td className="py-2 pr-4">필수</td>
                <td className="py-2 pr-4">이메일 주소</td>
                <td className="py-2">회원가입 시 직접 입력 또는 Google OAuth</td>
              </tr>
              <tr className="border-b border-[var(--border-subtle)]">
                <td className="py-2 pr-4">자동 수집</td>
                <td className="py-2 pr-4">서비스 이용 기록, 접속 로그</td>
                <td className="py-2">서비스 이용 과정에서 자동 생성</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Google 로그인 시</td>
                <td className="py-2 pr-4">이름, 프로필 이미지 URL</td>
                <td className="py-2">Google OAuth 동의 시 제공</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-[16px] font-bold mb-2">2. 개인정보의 수집 및 이용 목적</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>회원 식별 및 가입 의사 확인</li>
            <li>서비스 제공 및 기능 개선</li>
            <li>서비스 이용 기록 분석 (사용 패턴 기반 AI 학습 품질 향상)</li>
            <li>고객 문의 대응</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[16px] font-bold mb-2">3. 개인정보의 보유 및 이용 기간</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>회원 탈퇴 시까지 보유하며, 탈퇴 즉시 파기합니다.</li>
            <li>관련 법령에 의해 보존이 필요한 경우, 해당 법령에서 정한 기간 동안 보관합니다.</li>
            <li>전자상거래법에 따른 계약/거래 기록: 5년</li>
            <li>통신비밀보호법에 따른 접속 기록: 3개월</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[16px] font-bold mb-2">4. 개인정보의 제3자 제공</h2>
          <p>회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다.</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>법령에 의해 요구되는 경우</li>
            <li>수사 목적으로 법정 절차에 따라 요청되는 경우</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[16px] font-bold mb-2">5. 개인정보 처리 위탁</h2>
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 pr-4 font-semibold">수탁 업체</th>
                <th className="text-left py-2 pr-4 font-semibold">위탁 업무</th>
              </tr>
            </thead>
            <tbody className="text-[var(--text-secondary)]">
              <tr className="border-b border-[var(--border-subtle)]">
                <td className="py-2 pr-4">Supabase Inc.</td>
                <td className="py-2">데이터 저장 및 인증 서비스</td>
              </tr>
              <tr className="border-b border-[var(--border-subtle)]">
                <td className="py-2 pr-4">Anthropic PBC</td>
                <td className="py-2">AI 분석 API 제공 (입력 데이터 처리)</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Vercel Inc.</td>
                <td className="py-2">웹 서비스 호스팅</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-[16px] font-bold mb-2">6. 이용자의 입력 데이터 처리</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>이용자가 서비스에 입력하는 과제, 분석 결과, 피드백 등의 데이터는 이용자의 소유입니다.</li>
            <li>AI 분석을 위해 Anthropic API에 전송되며, Anthropic의 데이터 정책에 따라 처리됩니다.</li>
            <li>회사는 이용자의 입력 데이터를 AI 모델 학습에 사용하지 않습니다.</li>
            <li>이용자는 설정 페이지에서 언제든지 모든 데이터를 삭제할 수 있습니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[16px] font-bold mb-2">7. 이용자의 권리</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>개인정보 열람, 정정, 삭제를 요청할 수 있습니다.</li>
            <li>설정 페이지에서 직접 데이터를 내보내거나 삭제할 수 있습니다.</li>
            <li>회원 탈퇴 시 모든 개인정보와 서비스 데이터가 즉시 삭제됩니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[16px] font-bold mb-2">8. 개인정보의 안전성 확보 조치</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>비밀번호 암호화 저장 (Supabase Auth bcrypt)</li>
            <li>HTTPS 통신 암호화</li>
            <li>Row Level Security (RLS)를 통한 데이터 접근 통제</li>
            <li>관리자 접근 권한 최소화</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[16px] font-bold mb-2">9. 개인정보 보호책임자</h2>
          <p>개인정보 관련 문의는 아래 연락처로 접수해주세요.</p>
          <p className="mt-2 text-[var(--text-secondary)]">이메일: privacy@overture.app</p>
        </section>
      </div>
    </div>
  );
}
