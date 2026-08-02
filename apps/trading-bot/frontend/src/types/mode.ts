/** 실행 모드. mock = KIS 미호출 (UI 검증용), live = KIS 실호출. */
export type ExecutionMode = "mock" | "live";

export interface ModeStatus {
  /** 현재 실제로 로드된 프로필 (재시작 전까지 유지). */
  current: ExecutionMode | "";
  /** 다음 재시작 시 적용될 프로필 (.env 의 SPRING_PROFILES_ACTIVE 값). */
  pending: ExecutionMode | "";
  /** pending 이 current 와 다르면 true → 재시작 필요. */
  restartNeeded: boolean;
  /** 갱신되는 .env 파일 절대경로. 디버깅용. */
  envFile: string;
}
