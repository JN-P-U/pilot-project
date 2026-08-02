"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-blue-700 text-white h-14 flex items-center px-6 shadow-md shrink-0">
      <span className="text-lg font-bold tracking-tight">UI 테스트 증빙 시스템</span>
      <nav className="ml-10 flex gap-6 text-sm">
        <Link href="/" className="hover:text-blue-200 transition-colors font-medium">
          사용자 목록
        </Link>
      </nav>
    </header>
  );
}
