import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CH2CH 출석체크 관리",
  description: "구글시트 기반 CH2CH 출석체크 실행 요청과 결과 조회"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
