import type { Metadata } from "next";
import "./globals.css";
import { EvidenceFloat, EvidenceScreenProvider } from "@ui-test/react";

export const metadata: Metadata = {
  title: "UI 테스트 증빙 시스템",
  description: "단위 테스트 증빙 자동 생성 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="h-full bg-gray-50 text-gray-900 antialiased">
        <EvidenceScreenProvider>
          {children}
          <EvidenceFloat />
        </EvidenceScreenProvider>
      </body>
    </html>
  );
}
