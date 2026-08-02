"use client";

import { useState } from "react";
import EvidenceModal, { type CaseItem } from "./EvidenceModal";
import { useEvidenceScreenCtx } from "./EvidenceContext";
import styles from "./evidence.module.css";

function waitFrames() {
  return new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
}

export default function EvidenceFloat() {
  const { currentScreenId, currentScreenName } = useEvidenceScreenCtx();

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingCapture, setPendingCapture] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [serviceCode, setServiceCode] = useState("");
  const [screenId, setScreenId] = useState("");
  const [screenName, setScreenName] = useState("");
  const [author, setAuthor] = useState("");
  const [bizCategory, setBizCategory] = useState("");
  const [level1, setLevel1] = useState("");
  const [level2, setLevel2] = useState("");
  const [level3, setLevel3] = useState("");
  const [level4, setLevel4] = useState("");

  function resetMeta() {
    setServiceCode(""); setScreenId(""); setScreenName(""); setAuthor("");
    setBizCategory(""); setLevel1(""); setLevel2(""); setLevel3(""); setLevel4("");
  }

  async function captureScreen(): Promise<string> {
    const { toPng } = await import("html-to-image");
    return toPng(document.body, { pixelRatio: 1.5, cacheBust: true });
  }

  function initMeta() {
    if (!screenId) setScreenId(currentScreenId);
    if (!screenName) setScreenName(currentScreenName);
  }

  async function handleOpenEvidence() {
    if (cases.length > 0) { setModalOpen(true); return; }
    initMeta();
    setIsCapturing(true);
    await waitFrames();
    try {
      const image = await captureScreen();
      setCases([{
        id: Date.now().toString(), caseNumber: 1, image,
        testItem: "", testContent: "", expectedResult: "",
        programId: "", verifyMethod: "",
      }]);
      setModalOpen(true);
    } finally {
      setIsCapturing(false);
    }
  }

  function handleAddCase() {
    setModalOpen(false);
    setPendingCapture(true);
  }

  async function handlePendingCapture() {
    setIsCapturing(true);
    await waitFrames();
    try {
      const image = await captureScreen();
      setCases((prev) => {
        const nextNum = Math.max(...prev.map((c) => c.caseNumber), 0) + 1;
        return [...prev, {
          id: Date.now().toString(), caseNumber: nextNum, image,
          testItem: "", testContent: "", expectedResult: "",
          programId: "", verifyMethod: "",
        }];
      });
    } finally {
      setIsCapturing(false);
      setPendingCapture(false);
      setModalOpen(true);
    }
  }

  function handleCancelPendingCapture() {
    setPendingCapture(false);
    setModalOpen(true);
  }

  function handleDeleteCase(id: string) {
    setCases((prev) => prev.filter((c) => c.id !== id));
  }

  function handleUpdateCase(id: string, updates: Partial<Omit<CaseItem, "id" | "image">>) {
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }

  if (isCapturing) return null;

  return (
    <>
      {!pendingCapture && !modalOpen && (
        <div className={styles.floatWrap} style={{ zIndex: 10001 }}>
          <button type="button" onClick={handleOpenEvidence} className={styles.floatBtn}>
            {cases.length > 0 ? <>케이스 추가 ({cases.length})</> : <>테스트결과 추가</>}
          </button>
        </div>
      )}

      {pendingCapture && (
        <div className={styles.pendingWrap} style={{ zIndex: 10001 }}>
          <div className={styles.pendingTooltip}>
            원하는 화면 상태로 이동 후<br />아래 버튼을 눌러 캡처하세요
          </div>
          <button type="button" onClick={handlePendingCapture} className={styles.pendingCaptureBtn}>
            캡처 추가
          </button>
          <button type="button" onClick={handleCancelPendingCapture} className={styles.pendingBackBtn}>
            ← 돌아가기
          </button>
        </div>
      )}

      {modalOpen && (
        <EvidenceModal
          cases={cases}
          serviceCode={serviceCode}
          screenId={screenId}
          screenName={screenName}
          author={author}
          onAddCase={handleAddCase}
          onDeleteCase={handleDeleteCase}
          onUpdateCase={handleUpdateCase}
          onClose={() => { setModalOpen(false); resetMeta(); }}
          onNewTest={() => { setCases([]); resetMeta(); }}
          onDownloadComplete={() => { setCases([]); setModalOpen(false); resetMeta(); }}
          onServiceCodeChange={setServiceCode}
          onScreenIdChange={setScreenId}
          onScreenNameChange={setScreenName}
          onAuthorChange={setAuthor}
          bizCategory={bizCategory}
          level1={level1}
          level2={level2}
          level3={level3}
          level4={level4}
          onBizCategoryChange={setBizCategory}
          onLevel1Change={setLevel1}
          onLevel2Change={setLevel2}
          onLevel3Change={setLevel3}
          onLevel4Change={setLevel4}
        />
      )}
    </>
  );
}
