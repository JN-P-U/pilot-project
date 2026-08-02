"use client";

import { useState } from "react";
import type { Status } from "@/app/types";
import { useEvidenceScreen } from "@ui-test/react";

function AlertDialog({ message, onClose, zIndex = 10000 }: { message: string; onClose: () => void; zIndex?: number }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex }} onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm text-gray-700 whitespace-pre-wrap mb-4">{message}</p>
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700">확인</button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  onClose: () => void;
  onSave: (data: { name: string; email: string; department: string; role: string; status: Status }) => void;
}

const STATUS_OPTIONS: { label: string; value: Status }[] = [
  { label: "정상", value: "정상" },
  { label: "대기", value: "대기" },
  { label: "중지", value: "중지" },
];

export default function UserRegisterModal({ onClose, onSave }: Props) {
  useEvidenceScreen("UserRegisterModal", "사용자 등록");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<Status>("정상");
  const [alertMsg, setAlertMsg] = useState("");

  function handleSubmit() {
    if (!name.trim()) { setAlertMsg("이름을 입력해주세요."); return; }
    if (!email.trim()) { setAlertMsg("이메일을 입력해주세요."); return; }
    onSave({ name, email, department, role, status });
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />

        <div className="relative z-10 bg-white rounded-xl shadow-2xl w-[480px] flex flex-col overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-blue-700 text-white">
            <h2 className="text-base font-bold">사용자 등록</h2>
            <button type="button" onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
          </div>

          {/* 본문 */}
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름 입력"
                  className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">
                  이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일 입력"
                  className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">부서</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="부서 입력"
                  className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">역할</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="역할 입력"
                  className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">상태</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 푸터 */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              저장
            </button>
          </div>
        </div>
      </div>

      {alertMsg && <AlertDialog message={alertMsg} onClose={() => setAlertMsg("")} zIndex={9998} />}
    </>
  );
}
