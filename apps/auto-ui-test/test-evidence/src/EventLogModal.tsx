"use client";

import { useState } from "react";
import { generateEventExcel, makeEventFileName, type EventLogItem, type TestCaseMeta } from "./generate-event-excel";
import styles from "./evidence.module.css";

function AlertDialog({ message, onClose, onConfirm, zIndex = 10000 }: {
  message: string; onClose: () => void; onConfirm?: () => void; zIndex?: number;
}) {
  return (
    <div className={styles.alertOverlay} style={{ zIndex }} onClick={onClose}>
      <div className={styles.alertBox} onClick={(e) => e.stopPropagation()}>
        <p className={styles.alertMsg}>{message}</p>
        {onConfirm ? (
          <div className={styles.alertBtns}>
            <button type="button" onClick={onClose} className={styles.alertBtnCancel}>취소</button>
            <button type="button" onClick={onConfirm} className={styles.alertBtnOk}>확인</button>
          </div>
        ) : (
          <button type="button" onClick={onClose} className={styles.alertBtnOk}>확인</button>
        )}
      </div>
    </div>
  );
}

interface Props {
  events: EventLogItem[];
  serviceCode: string;
  screenId: string;
  screenName: string;
  author: string;
  bizCategory: string;
  level1: string; level2: string; level3: string; level4: string;
  caseMetas: TestCaseMeta[];
  onDeleteEvent: (id: string) => void;
  onUpdateEvent: (id: string, testResult: "pass" | "fail" | "na" | "") => void;
  onUpdateCaseMeta: (caseNumber: number, patch: Partial<Omit<TestCaseMeta, "caseNumber">>) => void;
  onClose: () => void;
  onClear: () => void;
  onDownloadComplete: () => void;
  onServiceCodeChange: (v: string) => void;
  onScreenIdChange: (v: string) => void;
  onScreenNameChange: (v: string) => void;
  onAuthorChange: (v: string) => void;
  onBizCategoryChange: (v: string) => void;
  onLevel1Change: (v: string) => void;
  onLevel2Change: (v: string) => void;
  onLevel3Change: (v: string) => void;
  onLevel4Change: (v: string) => void;
}

const EVENT_TYPE_LABEL: Record<string, string> = { click: "클릭", input: "입력", navigate: "이동" };

export default function EventLogModal({
  events, serviceCode, screenId, screenName, author,
  bizCategory, level1, level2, level3, level4,
  caseMetas, onDeleteEvent, onUpdateEvent, onUpdateCaseMeta, onClose, onClear, onDownloadComplete,
  onServiceCodeChange, onScreenIdChange, onScreenNameChange, onAuthorChange,
  onBizCategoryChange, onLevel1Change, onLevel2Change, onLevel3Change, onLevel4Change,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  const previewFileName = makeEventFileName({ serviceCode, screenId, screenName });

  async function handleDownload() {
    if (!serviceCode.trim()) { setAlertMsg("서비스코드를 입력해주세요."); return; }
    if (events.length === 0) { setAlertMsg("기록된 이벤트가 없습니다."); return; }
    setLoading(true);
    try {
      const bytes = await generateEventExcel({
        serviceCode, screenId, screenName, author,
        bizCategory, level1, level2, level3, level4,
        events,
      });
      const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const a = document.createElement("a");
      a.href = url; a.download = previewFileName; a.click();
      URL.revokeObjectURL(url);
      onDownloadComplete();
    } catch (e) {
      setAlertMsg("엑셀 다운로드 중 오류가 발생했습니다.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className={styles.modalOverlay} style={{ zIndex: 9999 }} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>이벤트 로그 증빙 생성</h2>
            <button type="button" onClick={onClose} className={styles.modalCloseBtn}>✕</button>
          </div>

          <div className={styles.modalBody}>
            <section>
              <h3 className={styles.sectionTitle}>파일 정보</h3>
              <div className={styles.grid4}>
                {([
                  ["서비스코드", serviceCode, onServiceCodeChange, "예) CHC", true],
                  ["화면ID",    screenId,    onScreenIdChange,    "",        false],
                  ["화면명",    screenName,  onScreenNameChange,  "",        false],
                  ["작성자",    author,      onAuthorChange,      "이름",    false],
                ] as [string, string, (v: string) => void, string, boolean][]).map(([label, value, onChange, placeholder, required]) => (
                  <div key={label} className={styles.field}>
                    <label className={styles.label}>{label}{required && <span className={styles.required}> *</span>}</label>
                    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={styles.input} />
                  </div>
                ))}
              </div>
              <div className={styles.grid5}>
                {([
                  ["업무분류", bizCategory, onBizCategoryChange],
                  ["Level1", level1, onLevel1Change],
                  ["Level2", level2, onLevel2Change],
                  ["Level3", level3, onLevel3Change],
                  ["Level4", level4, onLevel4Change],
                ] as [string, string, (v: string) => void][]).map(([label, value, onChange]) => (
                  <div key={label} className={styles.field}>
                    <label className={styles.label}>{label}</label>
                    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={styles.input} />
                  </div>
                ))}
              </div>
              <p className={styles.fileName} title={previewFileName}>파일명: {previewFileName}</p>
            </section>

            <section>
              <div className={styles.caseListHeader}>
                <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
                  이벤트 로그<span className={styles.caseCount}>{events.length}건</span>
                </h3>
              </div>

              {events.length === 0 ? (
                <div className={styles.emptyCase}>기록된 이벤트가 없습니다</div>
              ) : (
                <div className={styles.caseGroupList}>
                  {caseMetas.map((meta) => {
                    const caseEvents = events.filter((e) => (e.caseNumber ?? 1) === meta.caseNumber);
                    return (
                      <div key={meta.caseNumber} className={styles.caseGroup}>
                        <div className={styles.caseGroupHeader}>
                          <span className={styles.caseGroupLabel}>케이스 {meta.caseNumber}</span>
                          <input
                            type="text"
                            value={meta.caseName}
                            onChange={(ev) => onUpdateCaseMeta(meta.caseNumber, { caseName: ev.target.value })}
                            placeholder="케이스명 (선택)"
                            className={styles.caseGroupNameInput}
                          />
                          <select
                            value={meta.testResult ?? ""}
                            onChange={(ev) => onUpdateCaseMeta(meta.caseNumber, { testResult: (ev.target.value as "pass" | "fail" | "na") || undefined })}
                            className={`${styles.resultSelect} ${meta.testResult ? styles[`result_${meta.testResult}`] : ""}`}
                          >
                            <option value="">수행결과</option>
                            <option value="pass">통과</option>
                            <option value="fail">실패</option>
                            <option value="na">해당없음</option>
                          </select>
                          <span className={styles.caseCount}>{caseEvents.length}건</span>
                        </div>
                        {caseEvents.length === 0 ? (
                          <div className={styles.emptyCaseGroup}>이벤트 없음</div>
                        ) : (
                          <div className={styles.eventList}>
                            {caseEvents.map((e, idx) => (
                              <div key={e.id} className={styles.eventRow}>
                                <span className={styles.eventSeq}>{idx + 1}</span>
                                <span className={styles.eventTime}>{e.timestamp}</span>
                                <span className={`${styles.eventTypeBadge} ${styles[`eventType_${e.eventType}`]}`}>
                                  {EVENT_TYPE_LABEL[e.eventType] ?? e.eventType}
                                </span>
                                <span className={styles.eventDesc}>
                                  <span className={styles.eventTarget}>&lt;{e.targetTag}&gt;</span>{" "}
                                  {e.eventType === "click" && `[${e.targetLabel}] 클릭`}
                                  {e.eventType === "input" && `[${e.targetLabel}]${e.value ? ` → "${e.value}"` : " 입력"}`}
                                  {e.eventType === "navigate" && `${e.url} 이동`}
                                </span>
                                {e.screenshot && (
                                  <button type="button" className={styles.eventThumbBtn} onClick={() => setPreviewImg(e.screenshot!)}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={e.screenshot} alt={`이벤트 ${e.seq} 캡처`} className={styles.eventThumb} />
                                  </button>
                                )}
                                <select
                                  value={e.testResult ?? ""}
                                  onChange={(ev) => onUpdateEvent(e.id, ev.target.value as "pass" | "fail" | "na" | "")}
                                  className={`${styles.resultSelect} ${e.testResult ? styles[`result_${e.testResult}`] : ""}`}
                                >
                                  <option value="">결과</option>
                                  <option value="pass">통과</option>
                                  <option value="fail">실패</option>
                                  <option value="na">해당없음</option>
                                </select>
                                <button type="button" onClick={() => onDeleteEvent(e.id)} className={styles.deleteBtn} title="삭제">✕</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" onClick={() => setConfirmClear(true)} className={styles.newTestBtn}>전체 초기화</button>
            <div className={styles.footerRight}>
              <button type="button" onClick={onClose} className={styles.cancelBtn}>닫기</button>
              <button type="button" onClick={handleDownload} disabled={loading || events.length === 0} className={styles.downloadBtn}>
                {loading ? <><span className={styles.spinner} />생성 중...</> : "엑셀 다운로드"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {previewImg && (
        <div className={styles.previewOverlay} style={{ zIndex: 10002 }} onClick={() => setPreviewImg(null)}>
          <button type="button" className={styles.previewClose} onClick={() => setPreviewImg(null)}>✕</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewImg} alt="미리보기" className={styles.previewImg} onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {alertMsg && <AlertDialog message={alertMsg} onClose={() => setAlertMsg("")} zIndex={10001} />}
      {confirmClear && (
        <AlertDialog
          message={"기록된 모든 이벤트가 삭제됩니다.\n초기화하시겠습니까?"}
          onClose={() => setConfirmClear(false)}
          onConfirm={() => { setConfirmClear(false); onClear(); }}
          zIndex={10001}
        />
      )}
    </>
  );
}
