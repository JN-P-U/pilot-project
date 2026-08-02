"use client";

import { useState, useMemo } from "react";
import Header from "@/app/components/Header";
import UserTable from "@/app/components/UserTable";
import Pagination from "@/app/components/Pagination";
import UserRegisterModal from "@/app/components/UserRegisterModal";
import type { User, Status } from "@/app/types";

const MOCK_DATA: User[] = [
  { id: 1,  name: "김민준", email: "minjun.kim@corp.com",   department: "개발팀",   role: "개발자",     status: "정상", createdAt: "2024-01-05" },
  { id: 2,  name: "이서연", email: "seoyeon.lee@corp.com",  department: "기획팀",   role: "기획자",     status: "정상", createdAt: "2024-01-12" },
  { id: 3,  name: "박지호", email: "jiho.park@corp.com",    department: "QA팀",     role: "QA엔지니어", status: "정상", createdAt: "2024-02-01" },
  { id: 4,  name: "최수아", email: "sua.choi@corp.com",     department: "디자인팀", role: "디자이너",   status: "대기", createdAt: "2024-02-14" },
  { id: 5,  name: "정우진", email: "woojin.jung@corp.com",  department: "개발팀",   role: "개발자",     status: "정상", createdAt: "2024-03-03" },
  { id: 6,  name: "강예린", email: "yerin.kang@corp.com",   department: "인사팀",   role: "HR담당자",   status: "중지", createdAt: "2024-03-20" },
  { id: 7,  name: "윤현우", email: "hyunwoo.yoon@corp.com", department: "개발팀",   role: "개발자",     status: "정상", createdAt: "2024-04-01" },
  { id: 8,  name: "임나은", email: "naeun.lim@corp.com",    department: "QA팀",     role: "QA엔지니어", status: "정상", createdAt: "2024-04-15" },
  { id: 9,  name: "한도윤", email: "doyun.han@corp.com",    department: "기획팀",   role: "PM",         status: "정상", createdAt: "2024-05-02" },
  { id: 10, name: "오지민", email: "jimin.oh@corp.com",     department: "개발팀",   role: "개발자",     status: "대기", createdAt: "2024-05-18" },
  { id: 11, name: "신채원", email: "chaewon.shin@corp.com", department: "디자인팀", role: "디자이너",   status: "정상", createdAt: "2024-06-03" },
  { id: 12, name: "배준혁", email: "junhyeok.bae@corp.com", department: "개발팀",   role: "개발자",     status: "정상", createdAt: "2024-06-21" },
];

const PAGE_SIZE = 8;

const STATUS_OPTIONS: { label: string; value: "" | Status }[] = [
  { label: "전체", value: "" },
  { label: "정상", value: "정상" },
  { label: "대기", value: "대기" },
  { label: "중지", value: "중지" },
];

export default function UserListPage() {
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | Status>("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [appliedStatus, setAppliedStatus] = useState<"" | Status>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [registerOpen, setRegisterOpen] = useState(false);

  const filtered = useMemo(() => {
    return MOCK_DATA.filter((u) => {
      const matchKeyword =
        !appliedKeyword ||
        u.name.includes(appliedKeyword) ||
        u.email.includes(appliedKeyword) ||
        u.department.includes(appliedKeyword);
      const matchStatus = !appliedStatus || u.status === appliedStatus;
      return matchKeyword && matchStatus;
    });
  }, [appliedKeyword, appliedStatus]);

  const paged = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  function handleSearch() {
    setAppliedKeyword(keyword);
    setAppliedStatus(statusFilter);
    setCurrentPage(1);
    setSelectedIds([]);
  }

  function handleReset() {
    setKeyword("");
    setStatusFilter("");
    setAppliedKeyword("");
    setAppliedStatus("");
    setCurrentPage(1);
    setSelectedIds([]);
  }

  function handleToggle(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleToggleAll(ids: number[]) {
    const allSelected = ids.every((id) => selectedIds.includes(id));
    setSelectedIds(
      allSelected
        ? selectedIds.filter((id) => !ids.includes(id))
        : [...new Set([...selectedIds, ...ids])]
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 px-8 py-6 max-w-7xl w-full mx-auto">

        <div className="mb-5 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">사용자 목록</h1>
            <p className="text-sm text-gray-500 mt-0.5">시스템에 등록된 사용자를 조회합니다.</p>
          </div>
        </div>

        {/* 검색 영역 */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">상태</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "" | Status)}
                className="border border-gray-300 rounded px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-48">
              <label className="text-xs font-medium text-gray-500">검색어</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="이름, 이메일, 부서로 검색"
                className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors font-medium"
              >
                조회
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 bg-white text-gray-600 text-sm rounded border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                초기화
              </button>
            </div>
          </div>
        </div>

        {/* 목록 상단 액션 */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">
            총 <span className="font-semibold text-blue-600">{filtered.length}</span>건
            {selectedIds.length > 0 && (
              <span className="ml-2 text-gray-400">({selectedIds.length}개 선택)</span>
            )}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setRegisterOpen(true)} className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
              등록
            </button>
            <button
              type="button"
              disabled={selectedIds.length !== 1}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              수정
            </button>
            <button
              type="button"
              disabled={selectedIds.length === 0}
              className="px-3 py-1.5 text-sm bg-white border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-40"
            >
              삭제
            </button>
          </div>
        </div>

        {/* 테이블 */}
        <UserTable
          data={paged}
          selectedIds={selectedIds}
          onToggle={handleToggle}
          onToggleAll={handleToggleAll}
        />

        {/* 페이지네이션 */}
        <Pagination
          current={currentPage}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onChange={(p) => {
            setCurrentPage(p);
            setSelectedIds([]);
          }}
        />
      </main>

      {registerOpen && (
        <UserRegisterModal
          onClose={() => setRegisterOpen(false)}
          onSave={() => {}}
        />
      )}
    </div>
  );
}
