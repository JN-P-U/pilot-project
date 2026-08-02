import { useEffect } from "react";
import { localNameOf } from "../data/knownStocks";

interface Props {
  title: string;
  codes: string[];
  nameByCode: Record<string, string>;
  onClose: () => void;
}

/**
 * 허용/후보 종목 리스트 상세 팝업.
 * 각 코드에 대해 종목명을 함께 표시 — 백엔드 nameByCode 를 우선하고, 없으면 프론트 KnownStocks fallback.
 * Esc 키와 backdrop 클릭으로 닫힘.
 */
export function StockDetailModal({ title, codes, nameByCode, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const resolve = (code: string): string => {
    const fromBackend = nameByCode[code];
    if (fromBackend && fromBackend.length > 0) return fromBackend;
    const fromLocal = localNameOf(code);
    if (fromLocal) return fromLocal;
    return "(이름 미상)";
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h3>{title}</h3>
          <button onClick={onClose}>닫기 (Esc)</button>
        </div>
        {codes.length === 0 ? (
          <p className="source">등록된 종목이 없습니다.</p>
        ) : (
          <>
            <p className="source" style={{ marginTop: "0.25rem", fontSize: "0.8rem" }}>
              총 {codes.length} 종목
            </p>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>종목명</th>
                  <th>종목코드</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((code, i) => (
                  <tr key={code}>
                    <td className="mono">{i + 1}</td>
                    <td>{resolve(code)}</td>
                    <td className="mono">{code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
