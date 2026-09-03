import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal-document";
import styles from "@/components/legal-document.module.css";

const description = "Mion's Blog 개인정보처리방침 안내 페이지입니다.";

export const metadata: Metadata = {
  title: "개인정보처리방침 | Mion's Blog",
  description,
  alternates: {
    canonical: "/privacy-policy",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="개인정보처리방침"
      intro={
        <>
          Mion&apos;s Blog(이하 “블로그”)는 이용자의 개인정보를 중요하게
          생각하며, 「개인정보 보호법」 등 관련 법령을 준수합니다. 본
          개인정보처리방침은 블로그가 어떤 정보를 어떠한 목적으로 처리하는지
          설명합니다.
        </>
      }
    >
      <section aria-labelledby="privacy-items">
        <h2 id="privacy-items">1. 처리하는 개인정보의 항목</h2>
        <p>
          블로그는 회원가입, 댓글 및 뉴스레터 신청 기능을 제공하지 않으며,
          이름·전화번호·주소 등의 정보를 회원정보 형태로 수집하지 않습니다.
        </p>
        <p>
          다만 블로그 이용 과정에서 다음 정보가 자동으로 생성되거나 처리될 수
          있습니다.
        </p>
        <ul>
          <li>IP 주소</li>
          <li>브라우저 종류, 운영체제 및 기기 정보</li>
          <li>방문 일시, 방문·열람한 페이지, 유입 경로 및 접속 기록</li>
          <li>쿠키 및 유사한 온라인 식별자</li>
          <li>광고 노출, 클릭 등 광고와의 상호작용 정보</li>
          <li>서비스 오류 및 보안 관련 기록</li>
        </ul>
        <p>이용자가 이메일로 문의하는 경우 다음 정보가 처리될 수 있습니다.</p>
        <ul>
          <li>발신 이메일 주소</li>
          <li>이용자가 이메일에 기재한 이름 또는 닉네임</li>
          <li>문의 내용과 이용자가 직접 첨부한 자료</li>
        </ul>
        <p>
          이용자는 문의에 필요하지 않은 민감정보나 타인의 개인정보를 보내지
          않아야 합니다.
        </p>
      </section>

      <section aria-labelledby="privacy-purpose">
        <h2 id="privacy-purpose">2. 개인정보의 처리 목적</h2>
        <p>블로그는 다음 목적으로 정보를 처리할 수 있습니다.</p>
        <ul>
          <li>게시물 및 블로그 기능 제공</li>
          <li>방문 현황과 콘텐츠 이용 통계 분석</li>
          <li>서비스 품질 개선 및 오류 확인</li>
          <li>비정상적인 접근, 공격 및 부정 이용 방지</li>
          <li>이용자 문의 접수와 답변</li>
          <li>광고 제공, 광고 성과 측정 및 광고 부정행위 방지</li>
        </ul>
        <p>
          수집한 정보는 위 목적 이외의 용도로 이용하지 않으며, 처리 목적이
          변경되는 경우 관련 법령에 따라 필요한 조치를 취합니다.
        </p>
      </section>

      <section aria-labelledby="privacy-retention">
        <h2 id="privacy-retention">3. 개인정보의 처리 및 보유 기간</h2>
        <p>
          블로그는 개인정보의 처리 목적이 달성되면 지체 없이 해당 정보를
          파기합니다.
        </p>
        <ul>
          <li>문의 이메일 및 답변 기록: 문의 처리가 끝난 날부터 1년</li>
          <li>보안 및 접속 기록: 생성일로부터 최대 1년</li>
          <li>
            블로그 운영자가 개인을 식별할 수 없는 형태로 집계한 통계: 별도의
            보유기간 없이 이용될 수 있음
          </li>
        </ul>
        <p>
          다만 관련 법령에 따라 보관할 의무가 있거나 분쟁 대응을 위해 필요한
          경우에는 해당 근거와 기간에 따라 보관할 수 있습니다. Cloudflare 및
          Google이 직접 처리하는 정보의 보유기간은 각 사업자의 정책에 따릅니다.
        </p>
      </section>

      <section aria-labelledby="privacy-third-parties">
        <h2 id="privacy-third-parties">4. 개인정보의 제3자 제공</h2>
        <p>
          블로그는 이용자의 개인정보를 판매하지 않습니다. 또한 법령에 근거가
          있거나 이용자의 동의를 받은 경우를 제외하고 개인정보를 제3자에게
          제공하지 않습니다.
        </p>
        <p>
          다만 광고가 게재되는 경우 Google 및 Google의 광고 파트너가 광고 제공,
          측정, 개인화 및 부정행위 방지를 위해 쿠키, 웹 비콘, IP 주소 또는 그
          밖의 온라인 식별자를 이용할 수 있습니다. 자세한 내용은 아래 Google
          안내에서 확인할 수 있습니다.
        </p>
        <ul>
          <li>
            <a
              href="https://policies.google.com/technologies/partner-sites?hl=ko"
              rel="noopener noreferrer"
              target="_blank"
            >
              Google이 파트너 사이트 또는 앱의 정보를 사용하는 방식
            </a>
          </li>
          <li>
            <a
              href="https://policies.google.com/privacy?hl=ko"
              rel="noopener noreferrer"
              target="_blank"
            >
              Google 개인정보처리방침
            </a>
          </li>
        </ul>
      </section>

      <section aria-labelledby="privacy-external-services">
        <h2 id="privacy-external-services">
          5. 외부 서비스 이용 및 개인정보의 국외 처리
        </h2>
        <p>
          블로그는 안정적인 서비스 제공과 광고 운영을 위해 다음 외부 서비스를
          이용할 수 있습니다. 이 과정에서 정보가 대한민국 외의 국가에 위치한
          서버를 통해 처리될 수 있습니다.
        </p>

        <h3>Cloudflare, Inc.</h3>
        <dl>
          <div>
            <dt>처리 목적:</dt>
            <dd>콘텐츠 전송, 접속 보안, 장애 대응 및 방문 통계 분석</dd>
          </div>
          <div>
            <dt>처리될 수 있는 정보:</dt>
            <dd>
              IP 주소, 요청 정보, 브라우저·기기 정보, 방문 페이지, 접속 시각 및
              보안 기록
            </dd>
          </div>
          <div>
            <dt>처리 시점과 방법:</dt>
            <dd>이용자가 블로그에 접속할 때 네트워크를 통한 자동 전송</dd>
          </div>
          <div>
            <dt>처리 국가와 기간:</dt>
            <dd>
              Cloudflare가 서비스를 제공하는 국가 및 데이터센터에서 처리되며,
              보유기간은 Cloudflare 정책과 서비스 설정에 따름
            </dd>
          </div>
          <div>
            <dt>관련 정책:</dt>
            <dd>
              <a
                href="https://www.cloudflare.com/policies/privacy/"
                rel="noopener noreferrer"
                target="_blank"
              >
                Cloudflare 개인정보처리방침
              </a>
            </dd>
          </div>
        </dl>
        <p>
          Cloudflare의 콘텐츠 전송 및 보안 처리를 거부하면 블로그 접속이 제한될
          수 있습니다.
        </p>

        <h3>Google LLC 및 Google의 광고 파트너</h3>
        <dl>
          <div>
            <dt>처리 목적:</dt>
            <dd>광고 제공, 광고 개인화, 광고 성과 측정 및 부정행위 방지</dd>
          </div>
          <div>
            <dt>처리될 수 있는 정보:</dt>
            <dd>
              IP 주소, 쿠키와 온라인 식별자, 브라우저·기기 정보, 방문 페이지,
              광고 노출 및 상호작용 정보
            </dd>
          </div>
          <div>
            <dt>처리 시점과 방법:</dt>
            <dd>
              광고가 포함된 페이지를 열거나 광고와 상호작용할 때 네트워크를 통한
              자동 전송
            </dd>
          </div>
          <div>
            <dt>처리 국가와 기간:</dt>
            <dd>
              Google 및 광고 파트너가 서비스를 제공하는 국가에서 처리되며,
              보유기간은 각 사업자의 정책에 따름
            </dd>
          </div>
          <div>
            <dt>관련 정책:</dt>
            <dd>
              <a
                href="https://policies.google.com/privacy?hl=ko"
                rel="noopener noreferrer"
                target="_blank"
              >
                Google 개인정보처리방침
              </a>
            </dd>
          </div>
        </dl>
        <p>
          이용자는 쿠키 설정이나 광고 설정을 변경하여 맞춤형 광고를 제한할 수
          있습니다. 제한하더라도 맞춤화되지 않은 광고가 표시될 수 있습니다.
        </p>
      </section>

      <section aria-labelledby="privacy-cookies">
        <h2 id="privacy-cookies">6. 쿠키 및 자동 수집 장치</h2>
        <p>
          블로그와 외부 서비스 제공자는 다음 목적을 위해 쿠키 또는 유사한 저장
          기술을 사용할 수 있습니다.
        </p>
        <ul>
          <li>서비스의 정상적인 제공과 보안 유지</li>
          <li>방문 통계 및 이용 형태 분석</li>
          <li>광고 제공과 성과 측정</li>
          <li>이용자의 동의 여부 및 광고 설정 저장</li>
        </ul>
        <p>
          Google을 포함한 제3자 광고 사업자는 이용자의 이전 방문 기록 등을
          바탕으로 광고를 제공하기 위해 쿠키를 사용할 수 있습니다.
        </p>
        <p>
          이용자는 브라우저 설정에서 쿠키를 삭제하거나 저장을 제한할 수
          있습니다. 또한{" "}
          <a
            href="https://adssettings.google.com/"
            rel="noopener noreferrer"
            target="_blank"
          >
            Google 광고 설정
          </a>
          에서 맞춤형 광고 설정을 관리할 수 있습니다. 쿠키를 제한하면 일부
          기능이 정상적으로 동작하지 않거나 맞춤화되지 않은 광고가 표시될 수
          있습니다.
        </p>
        <p>
          유럽경제지역(EEA), 영국 및 스위스 등 동의가 필요한 지역의 이용자에게는
          관련 법령과 Google 정책에 따라 쿠키와 개인정보 이용에 대한 선택 화면이
          제공될 수 있습니다.
        </p>
      </section>

      <section aria-labelledby="privacy-destruction">
        <h2 id="privacy-destruction">7. 개인정보의 파기 절차 및 방법</h2>
        <p>
          처리 목적이 달성되거나 보유기간이 끝난 개인정보는 지체 없이
          파기합니다.
        </p>
        <ul>
          <li>전자적 파일: 복구하거나 재생할 수 없는 방법으로 삭제</li>
          <li>종이 문서: 분쇄하거나 소각</li>
        </ul>
        <p>
          법령에 따라 일정 기간 보존해야 하는 정보는 다른 정보와 분리하여 해당
          기간 동안 보관한 뒤 파기합니다.
        </p>
      </section>

      <section aria-labelledby="privacy-rights">
        <h2 id="privacy-rights">8. 이용자의 권리와 행사 방법</h2>
        <p>
          이용자는 관련 법령이 정하는 범위에서 자신의 개인정보에 대해 다음
          권리를 행사할 수 있습니다.
        </p>
        <ul>
          <li>개인정보 처리 여부 확인 및 열람 요청</li>
          <li>개인정보 정정 또는 삭제 요청</li>
          <li>개인정보 처리정지 요청</li>
          <li>동의를 근거로 처리하는 경우 동의 철회</li>
        </ul>
        <p>
          권리 행사는 아래 이메일로 요청할 수 있습니다. 블로그는 요청자의 본인
          여부를 확인한 뒤 관련 법령에 따라 처리합니다. Cloudflare 또는 Google이
          직접 보유한 정보는 해당 사업자에게 요청해야 할 수 있습니다.
        </p>
      </section>

      <section aria-labelledby="privacy-security">
        <h2 id="privacy-security">9. 개인정보의 안전성 확보 조치</h2>
        <p>
          블로그는 개인정보의 분실, 유출, 변조 또는 훼손을 방지하기 위해 다음과
          같은 조치를 취합니다.
        </p>
        <ul>
          <li>HTTPS를 이용한 전송 구간 암호화</li>
          <li>운영 시스템과 관리 기능에 대한 접근 제한</li>
          <li>보안 업데이트 및 취약점 점검</li>
          <li>비정상적인 접근과 공격에 대한 탐지 및 차단</li>
          <li>개인정보를 처리하는 계정과 권한의 최소화</li>
        </ul>
      </section>

      <section aria-labelledby="privacy-contact">
        <h2 id="privacy-contact">10. 개인정보 보호책임자 및 문의처</h2>
        <p>개인정보 보호책임자: 김종윤</p>
        <p>
          이메일:{" "}
          <a href="mailto:contact@mion-space.dev">contact@mion-space.dev</a>
        </p>
        <p>
          개인정보 처리에 대한 문의, 불만 또는 권리 행사 요청은 위 이메일로
          접수할 수 있습니다.
        </p>
        <p>
          개인정보 침해에 대한 상담이나 분쟁 해결이 필요한 경우 다음 기관에
          문의할 수 있습니다.
        </p>
        <ul>
          <li>
            개인정보침해 신고센터: 국번 없이 118,{" "}
            <a
              href="https://privacy.kisa.or.kr/"
              rel="noopener noreferrer"
              target="_blank"
            >
              privacy.kisa.or.kr
            </a>
          </li>
          <li>
            개인정보 분쟁조정위원회: 1833-6972,{" "}
            <a
              href="https://kopico.go.kr/"
              rel="noopener noreferrer"
              target="_blank"
            >
              kopico.go.kr
            </a>
          </li>
          <li>
            경찰청 사이버범죄 신고시스템: 국번 없이 182,{" "}
            <a
              href="https://ecrm.police.go.kr/"
              rel="noopener noreferrer"
              target="_blank"
            >
              ecrm.police.go.kr
            </a>
          </li>
        </ul>
      </section>

      <section aria-labelledby="privacy-changes">
        <h2 id="privacy-changes">11. 개인정보처리방침의 변경</h2>
        <p>
          본 개인정보처리방침은 법령, 서비스 기능 또는 외부 서비스 이용 방식의
          변경에 따라 수정될 수 있습니다. 변경되는 경우 시행일과 주요 변경
          내용을 블로그를 통해 안내합니다.
        </p>
        <p className={styles.effectiveDate}>
          시행일: <time dateTime="2026-09-03">2026년 9월 3일</time>
        </p>
      </section>
    </LegalDocument>
  );
}
