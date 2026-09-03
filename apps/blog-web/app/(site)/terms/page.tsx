import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument } from "@/components/legal-document";
import styles from "@/components/legal-document.module.css";

const description = "Mion's Blog 이용약관 안내 페이지입니다.";

export const metadata: Metadata = {
  title: "이용약관 | Mion's Blog",
  description,
  alternates: {
    canonical: "/terms",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsPage() {
  return (
    <LegalDocument
      title="이용약관"
      intro={
        <>
          본 이용약관은 Mion&apos;s Blog(이하 “블로그”)가 제공하는 콘텐츠와
          기능의 이용 조건을 규정합니다.
        </>
      }
    >
      <section aria-labelledby="terms-purpose">
        <h2 id="terms-purpose">1. 목적</h2>
        <p>
          본 약관은 블로그 이용과 관련하여 블로그 운영자와 이용자 사이의 권리,
          의무 및 책임사항을 정하는 것을 목적으로 합니다.
        </p>
      </section>

      <section aria-labelledby="terms-services">
        <h2 id="terms-services">2. 블로그가 제공하는 서비스</h2>
        <p>블로그는 다음 서비스를 제공합니다.</p>
        <ul>
          <li>
            백엔드 개발, 인프라, 데이터베이스, 보안 및 인공지능 도구 등에 관한
            글과 자료
          </li>
          <li>게시물 검색, 분류 및 열람 기능</li>
          <li>외부 웹사이트나 참고 자료로 연결되는 링크</li>
          <li>광고 및 그 밖에 운영자가 정하는 기능</li>
        </ul>
        <p>블로그는 별도의 회원가입 없이 이용할 수 있습니다.</p>
      </section>

      <section aria-labelledby="terms-content">
        <h2 id="terms-content">3. 콘텐츠의 성격과 이용자의 판단</h2>
        <p>
          블로그에 게시된 글은 운영자의 경험과 조사 내용을 바탕으로 작성한
          일반적인 정보입니다. 특정 상황에 대한 전문적인 법률·세무·의료·투자
          자문이나 특정 제품·서비스의 성능 보증을 목적으로 하지 않습니다.
        </p>
        <p>
          기술 정보와 예제 코드는 작성 당시의 환경을 기준으로 하며, 소프트웨어
          버전, 실행 환경 또는 외부 서비스의 변경에 따라 현재 환경에서 동일하게
          동작하지 않을 수 있습니다. 이용자는 실제 적용 전에 자신의 환경에서
          보안, 호환성, 데이터 손실 가능성 및 라이선스를 직접 검토해야 합니다.
        </p>
      </section>

      <section aria-labelledby="terms-user-obligations">
        <h2 id="terms-user-obligations">4. 이용자의 의무</h2>
        <p>이용자는 다음 행위를 해서는 안 됩니다.</p>
        <ul>
          <li>관련 법령을 위반하거나 타인의 권리를 침해하는 행위</li>
          <li>블로그 또는 서버에 과도한 부하를 발생시키는 행위</li>
          <li>보안 기능이나 기술적 제한을 우회하거나 취약점을 악용하는 행위</li>
          <li>악성 코드 또는 유해한 데이터를 전송하는 행위</li>
          <li>블로그의 정상적인 운영을 방해하는 비정상적 자동 요청</li>
          <li>
            출처를 오인하게 만들거나 운영자가 보증한 것처럼 콘텐츠를 이용하는
            행위
          </li>
        </ul>
        <p>
          일반적인 검색엔진의 색인 수집, 웹 표준을 준수하는 링크 공유 및 관련
          법령이 허용하는 정당한 인용은 위 금지 대상에 포함되지 않습니다.
        </p>
      </section>

      <section aria-labelledby="terms-copyright">
        <h2 id="terms-copyright">5. 저작권 및 콘텐츠 이용</h2>
        <p>
          블로그에 운영자가 직접 작성한 글, 이미지, 코드 및 디자인에 관한 권리는
          운영자에게 귀속됩니다. 별도의 라이선스가 표시된 자료는 해당 라이선스
          조건을 따릅니다.
        </p>
        <p>
          이용자는 관련 법령이 허용하는 범위에서 출처와 원문 링크를 명확히
          표시하여 콘텐츠의 일부를 인용할 수 있습니다. 운영자의 사전 허락 없이
          콘텐츠 전체 또는 상당 부분을 복제·재게시·판매하거나, 자동 수집하여
          별도의 콘텐츠·데이터 상품으로 제공해서는 안 됩니다.
        </p>
        <p>
          글에서 인용하거나 연결한 제3자 자료의 권리는 각 권리자에게 귀속됩니다.
        </p>
      </section>

      <section aria-labelledby="terms-advertising">
        <h2 id="terms-advertising">6. 광고 및 외부 링크</h2>
        <p>
          블로그에는 Google AdSense 등의 광고가 표시될 수 있습니다. 광고의 내용,
          상품 또는 서비스는 해당 광고주와 제공자의 책임이며, 광고가 표시된다는
          사실만으로 블로그 운영자가 이를 보증하거나 추천하는 것은 아닙니다.
        </p>
        <p>
          블로그에는 참고를 위해 외부 사이트로 연결되는 링크가 포함될 수
          있습니다. 외부 사이트의 콘텐츠, 개인정보 처리, 보안 및 이용 가능성은
          해당 사이트의 정책과 책임에 따릅니다.
        </p>
      </section>

      <section aria-labelledby="terms-service-changes">
        <h2 id="terms-service-changes">7. 서비스의 변경·중단·종료</h2>
        <p>
          운영자는 다음 사유가 있는 경우 블로그의 전부 또는 일부를 변경, 제한,
          일시 중단하거나 종료할 수 있습니다.
        </p>
        <ul>
          <li>시스템 점검, 유지보수 또는 기능 개선</li>
          <li>보안 사고나 비정상적인 접근에 대한 대응</li>
          <li>호스팅, CDN, 광고 등 외부 서비스의 변경 또는 장애</li>
          <li>천재지변, 통신 장애 등 합리적으로 통제하기 어려운 사유</li>
          <li>법령 또는 관계기관의 요구</li>
          <li>그 밖의 기술적·운영상 필요</li>
        </ul>
        <p>
          중요한 변경이나 장기간의 중단이 예정된 경우 합리적으로 가능한 범위에서
          블로그를 통해 안내합니다.
        </p>
      </section>

      <section aria-labelledby="terms-liability">
        <h2 id="terms-liability">8. 책임의 제한</h2>
        <p>
          운영자는 정확하고 유용한 정보를 제공하기 위해 노력하지만, 모든
          콘텐츠의 완전성, 최신성, 특정 목적에 대한 적합성 또는 오류가 없음을
          보증하지 않습니다.
        </p>
        <p>
          관련 법령에서 허용하는 범위에서 운영자는 다음 사유로 발생한 손해에
          대해 책임을 부담하지 않습니다.
        </p>
        <ul>
          <li>
            이용자가 블로그 콘텐츠 또는 예제 코드를 자신의 환경에 적용한 결과
          </li>
          <li>이용자의 기기, 소프트웨어 또는 네트워크 환경에서 발생한 문제</li>
          <li>외부 사이트, 광고 또는 제3자 서비스의 이용</li>
          <li>
            운영자가 합리적으로 통제하기 어려운 서비스 중단이나 데이터 전송 장애
          </li>
        </ul>
        <p>
          다만 운영자의 고의 또는 중대한 과실로 발생한 손해나 관련 법령상 제한할
          수 없는 책임까지 배제하는 것은 아닙니다.
        </p>
      </section>

      <section aria-labelledby="terms-privacy">
        <h2 id="terms-privacy">9. 개인정보 보호</h2>
        <p>
          블로그 이용 과정에서 처리되는 정보에 관한 사항은 별도의{" "}
          <Link href="/privacy-policy">개인정보처리방침</Link>에 따릅니다.
        </p>
      </section>

      <section aria-labelledby="terms-changes">
        <h2 id="terms-changes">10. 약관의 변경</h2>
        <p>
          운영자는 관련 법령 또는 서비스 내용의 변경에 따라 본 약관을 수정할 수
          있습니다. 변경된 약관은 시행일과 함께 블로그에 게시합니다. 이용자에게
          불리한 중대한 변경은 합리적인 기간을 두고 알기 쉬운 방법으로
          안내합니다.
        </p>
      </section>

      <section aria-labelledby="terms-law">
        <h2 id="terms-law">11. 준거법 및 분쟁 해결</h2>
        <p>
          본 약관은 대한민국 법률에 따라 해석됩니다. 블로그 이용과 관련해 분쟁이
          발생한 경우 운영자와 이용자는 원만한 해결을 위해 성실히 협의하며,
          해결되지 않는 경우 관련 법령이 정한 절차와 관할 법원에 따릅니다.
        </p>
      </section>

      <section aria-labelledby="terms-contact">
        <h2 id="terms-contact">12. 문의</h2>
        <p>운영자: Mion</p>
        <p>
          이메일:{" "}
          <a href="mailto:contact@mion-space.dev">contact@mion-space.dev</a>
        </p>
        <p className={styles.effectiveDate}>
          시행일: <time dateTime="2026-09-03">2026년 9월 3일</time>
        </p>
      </section>
    </LegalDocument>
  );
}
