"use client";

interface Props {
  current: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export default function Pagination({ current, total, pageSize, onChange }: Props) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      <button
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        className="px-3 py-1.5 rounded border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-100 transition-colors"
      >
        이전
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-3 py-1.5 rounded border text-sm transition-colors ${
            p === current
              ? "bg-blue-600 text-white border-blue-600 font-medium"
              : "border-gray-300 hover:bg-gray-100"
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(current + 1)}
        disabled={current === totalPages}
        className="px-3 py-1.5 rounded border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-100 transition-colors"
      >
        다음
      </button>
    </div>
  );
}
