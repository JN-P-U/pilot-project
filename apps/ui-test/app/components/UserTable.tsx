"use client";

import type { User } from "@/app/types";
import StatusBadge from "./StatusBadge";

interface Props {
  data: User[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  onToggleAll: (ids: number[]) => void;
}

export default function UserTable({ data, selectedIds, onToggle, onToggleAll }: Props) {
  const allSelected = data.length > 0 && data.every((u) => selectedIds.includes(u.id));

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-200">
            <th className="w-10 px-4 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onToggleAll(data.map((u) => u.id))}
                className="accent-blue-600"
              />
            </th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600 w-12">No</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">이름</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">이메일</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">부서</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">역할</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-600">상태</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">등록일</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                조회된 데이터가 없습니다.
              </td>
            </tr>
          ) : (
            data.map((user, idx) => (
              <tr
                key={user.id}
                className="border-b border-gray-100 hover:bg-blue-50 transition-colors"
              >
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(user.id)}
                    onChange={() => onToggle(user.id)}
                    className="accent-blue-600"
                  />
                </td>
                <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                <td className="px-4 py-3 text-gray-600">{user.email}</td>
                <td className="px-4 py-3 text-gray-600">{user.department}</td>
                <td className="px-4 py-3 text-gray-600">{user.role}</td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={user.status} />
                </td>
                <td className="px-4 py-3 text-gray-500">{user.createdAt}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
