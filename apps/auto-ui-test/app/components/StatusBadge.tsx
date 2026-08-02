import type { Status } from "@/app/types";

const styleMap: Record<Status, string> = {
  정상: "bg-green-100 text-green-700",
  중지: "bg-red-100 text-red-700",
  대기: "bg-yellow-100 text-yellow-700",
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styleMap[status]}`}>
      {status}
    </span>
  );
}
