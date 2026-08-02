export type Status = "정상" | "중지" | "대기";

export interface User {
  id: number;
  name: string;
  email: string;
  department: string;
  role: string;
  status: Status;
  createdAt: string;
}
