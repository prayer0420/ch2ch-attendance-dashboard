import type { Metadata, Viewport } from "next";
import { AppInstallProvider } from "@/components/app-install";
import "./globals.css";

export const metadata: Metadata = {
  title: "CH2CH 출석체크 관리",
  description: "구글시트 기반 CH2CH 출석체크 실행 요청과 결과 조회",
  appleWebApp: { capable: true, title: "CH2CH", statusBarStyle: "default" },
  icons: { icon: "/icons/app-192.png", apple: "/icons/app-192.png" }
};

export const viewport: Viewport = { themeColor: "#2e6f73", viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body><AppInstallProvider>{children}</AppInstallProvider></body>
    </html>
  );
}
