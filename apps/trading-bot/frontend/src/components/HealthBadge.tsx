import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { HealthResponse } from "../types/trading";

export function HealthBadge() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) return <span className="badge down">백엔드 연결 실패</span>;
  if (!health) return <span className="badge">확인 중...</span>;
  const profiles = health.profiles.length ? health.profiles.join(", ") : "default";
  return (
    <span className={`badge ${health.status === "UP" ? "up" : "down"}`}>
      백엔드 {health.status} · {profiles}
    </span>
  );
}
