"use client";

import { useState } from "react";
import { generateExcel, makeFileName, type CaseItem } from "./generate-excel";
import styles from "./evidence.module.css";

export type { CaseItem };

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
  cases: CaseItem[];
  serviceCode: string;
  screenId: string;
  screenName: string;
  author: string;
  bizCategory: string;
  level1: string; level2: string; level3: string; level4: string;
  onAddCase: () => void;
  onDeleteCase: (id: string) => void;
  onUpdateCase: (id: string, updates: Partial<Omit<CaseItem, "id" | "image">>) => void;
  onClose: () => void;
  onNewTest: () => void;
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

export default function EvidenceModal({
  cases, serviceCode, screenId, screenName, author,
  bizCategory, level1, level2, level3, level4,
  onAddCase, onDeleteCase, onUpdateCase, onClose, onNewTest, onDownloadComplete,
  onServiceCodeChange, onScreenIdChange, onScreenNameChange, onAuthorChange,
  onBizCategoryChange, onLevel1Change, onLevel2Change, onLevel3Change, onLevel4Change,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [confirmNewTest, setConfirmNewTest] = useState(false);

  const previewFileName = makeFileName({ serviceCode, screenId, screenName });

  async function handleDownload() {
    if (!serviceCode.trim()) { setAlertMsg("서비스코드를 입력해주세요."); return; }
    if (cases.length === 0) { setAlertMsg("캡처된 케이스가 없습니다."); return; }
    setLoading(true);
    try {
      const bytes = await generateExcel({ serviceCode, screenId, screenName, author, bizCategory, level1, level2, level3, level4, cases });
      const buffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(buffer).set(bytes);
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
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
            <h2 className={styles.modalTitle}>테스트 증빙 생성</h2>
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
                {([["업무분류", bizCategory, onBizCategoryChange], ["Level1", level1, onLevel1Change], ["Level2", level2, onLevel2Change], ["Level3", level3, onLevel3Change], ["Level4", level4, onLevel4Change]] as [string, string, (v: string) => void][]).map(([label, value, onChange]) => (
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
                  테스트 케이스<span className={styles.caseCount}>{cases.length}건</span>
                </h3>
                <button type="button" onClick={onAddCase} className={styles.addCaseBtn}>+ 케이스 추가</button>
              </div>

              {cases.length === 0 ? (
                <div className={styles.emptyCase}>캡처된 케이스가 없습니다</div>
              ) : (
                <div className={styles.caseList}>
                  {[...cases].reverse().map((c) => (
                    <div key={c.id} className={styles.caseCard}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <div className={styles.thumbnail}><img src={c.image} alt={`케이스 ${c.caseNumber} 캡처`} /></div>
                      <div className={styles.caseFields}>
                        <div className={styles.caseFieldRow}>
                          <div className={styles.caseNumWrap}>
                            <label className={styles.caseNumLabel}>케이스번호</label>
                            <input type="number" min="1" value={c.caseNumber} onChange={(e) => onUpdateCase(c.id, { caseNumber: parseInt(e.target.value) || 1 })} className={styles.caseNumInput} />
                          </div>
                          <button type="button" onClick={() => onDeleteCase(c.id)} className={styles.deleteBtn} title="케이스 삭제">✕</button>
                        </div>
                        {([["테스트항목", c.testItem, "testItem"], ["프로그램ID", c.programId, "programId"], ["결과확인방법", c.verifyMethod, "verifyMethod"]] as [string, string, keyof Omit<CaseItem, "id"|"image"|"caseNumber">][]).map(([label, value, key]) => (
                          <div key={key} className={styles.field}>
                            <label className={styles.label}>{label}</label>
                            <input type="text" value={value} onChange={(e) => onUpdateCase(c.id, { [key]: e.target.value })} className={styles.input} />
                          </div>
                        ))}
                        {([["테스트내용", c.testContent, "testContent"], ["예상결과", c.expectedResult, "expectedResult"]] as [string, string, keyof Omit<CaseItem, "id"|"image"|"caseNumber">][]).map(([label, value, key]) => (
                          <div key={key} className={styles.field}>
                            <label className={styles.label}>{label}</label>
                            <textarea value={value} onChange={(e) => onUpdateCase(c.id, { [key]: e.target.value })} rows={2} className={styles.textarea} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" onClick={() => setConfirmNewTest(true)} className={styles.newTestBtn}>새 테스트 추가</button>
            <div className={styles.footerRight}>
              <button type="button" onClick={onClose} className={styles.cancelBtn}>취소</button>
              <button type="button" onClick={handleDownload} disabled={loading || cases.length === 0} className={styles.downloadBtn}>
                {loading ? <><span className={styles.spinner} />생성 중...</> : "엑셀 다운로드"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {alertMsg && <AlertDialog message={alertMsg} onClose={() => setAlertMsg("")} zIndex={10001} />}
      {confirmNewTest && (
        <AlertDialog
          message={"현재 케이스가 모두 삭제됩니다.\n새 테스트를 시작하시겠습니까?"}
          onClose={() => setConfirmNewTest(false)}
          onConfirm={() => { setConfirmNewTest(false); onNewTest(); }}
          zIndex={10001}
        />
      )}
    </>
  );
}
