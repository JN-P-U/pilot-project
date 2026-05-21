"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./evidence.module.css";
import EventLogModal from "./EventLogModal";
import type { EventLogItem, TestCaseMeta } from "./generate-event-excel";

function waitFrames() {
  return new Promise<void>((res) => requestAnimationFrame(() => requestAnimationFrame(() => res())));
}

function getLabel(el: Element): string {
  const e = el as HTMLElement;
  const ariaLabel = e.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel.slice(0, 40);
  const text = e.textContent?.trim().replace(/\s+/g, " ").slice(0, 40);
  if (text) return text;
  const inp = e as HTMLInputElement;
  if (inp.placeholder) return inp.placeholder.slice(0, 40);
  if (inp.name) return inp.name;
  if (e.id) return `#${e.id}`;
  return e.tagName.toLowerCase();
}

function nowStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

export default function EventRecorder() {
  const [recording, setRecording] = useState(false);
  const [events, setEvents] = useState<EventLogItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
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

  const [currentCaseNumber, setCurrentCaseNumber] = useState(1);
  const [caseMetas, setCaseMetas] = useState<TestCaseMeta[]>([{ caseNumber: 1, caseName: "" }]);

  const recordingRef = useRef(false);
  const capturingRef = useRef(false);
  const seqRef = useRef(0);
  const lastKeyRecordedRef = useRef<EventTarget | null>(null);
  const currentCaseNumberRef = useRef(1);

  useEffect(() => { recordingRef.current = recording; }, [recording]);
  useEffect(() => { currentCaseNumberRef.current = currentCaseNumber; }, [currentCaseNumber]);

  async function captureScreen(): Promise<string> {
    const { toPng } = await import("html-to-image");
    return toPng(document.body, { pixelRatio: 1.5, cacheBust: true });
  }

  const handleClick = useCallback(async (e: MouseEvent) => {
    if (!recordingRef.current || capturingRef.current) return;
    const target = e.target as Element;
    if (target.closest("[data-event-recorder]")) return;

    const seq = ++seqRef.current;
    const timestamp = nowStr();
    const tag = target.tagName.toLowerCase();
    const label = getLabel(target);
    const url = window.location.pathname;

    capturingRef.current = true;
    setIsCapturing(true);
    await waitFrames();
    let screenshot: string | undefined;
    try {
      screenshot = await captureScreen();
    } catch {
      // 캡처 실패 시 스크린샷 없이 이벤트만 기록
    } finally {
      capturingRef.current = false;
      setIsCapturing(false);
    }

    setEvents((prev) => [...prev, {
      id: `${Date.now()}-${seq}`,
      seq,
      timestamp,
      eventType: "click",
      targetTag: tag,
      targetLabel: label,
      url,
      screenshot,
      caseNumber: currentCaseNumberRef.current,
    }]);
  }, []);

  const handleChange = useCallback((e: Event) => {
    if (!recordingRef.current) return;
    const target = e.target as HTMLInputElement;
    if (target.closest("[data-event-recorder]")) return;
    // Enter keydown으로 이미 기록한 경우 중복 방지
    if (lastKeyRecordedRef.current === target) {
      lastKeyRecordedRef.current = null;
      return;
    }

    const seq = ++seqRef.current;
    setEvents((prev) => [...prev, {
      id: `${Date.now()}-${seq}`,
      seq,
      timestamp: nowStr(),
      eventType: "input",
      targetTag: target.tagName.toLowerCase(),
      targetLabel: getLabel(target),
      value: target.value?.slice(0, 100),
      url: window.location.pathname,
      caseNumber: currentCaseNumberRef.current,
    }]);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!recordingRef.current || capturingRef.current) return;
    if (e.key !== "Enter") return;
    const target = e.target as HTMLInputElement;
    if (!["INPUT", "TEXTAREA"].includes(target.tagName)) return;
    if (target.closest("[data-event-recorder]")) return;

    lastKeyRecordedRef.current = target;
    const seq = ++seqRef.current;
    setEvents((prev) => [...prev, {
      id: `${Date.now()}-${seq}`,
      seq,
      timestamp: nowStr(),
      eventType: "input",
      targetTag: target.tagName.toLowerCase(),
      targetLabel: getLabel(target),
      value: target.value?.slice(0, 100),
      url: window.location.pathname,
      caseNumber: currentCaseNumberRef.current,
    }]);
  }, []);

  useEffect(() => {
    if (!recording) return;
    document.addEventListener("click", handleClick, true);
    document.addEventListener("change", handleChange, true);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("change", handleChange, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [recording, handleClick, handleChange, handleKeyDown]);

  if (isCapturing) return null;

  const hasEvents = events.length > 0;

  return (
    <>
      {!modalOpen && (
        <div data-event-recorder className={styles.recorderWrap}>
          {recording ? (
            <>
              <button
                type="button"
                onClick={() => {
                  const next = currentCaseNumber + 1;
                  setCurrentCaseNumber(next);
                  currentCaseNumberRef.current = next;
                  setCaseMetas((prev) => [...prev, { caseNumber: next, caseName: "" }]);
                }}
                className={styles.floatBtn}
                style={{ background: "#0891b2", marginBottom: "0.5rem" }}
              >
                케이스 구분 ({currentCaseNumber})
              </button>
              <button
                type="button"
                onClick={() => setRecording(false)}
                className={styles.recorderBtnActive}
              >
                <span className={styles.recorderDot} />
                기록 중 ({events.length})
              </button>
            </>
          ) : (
            <>
              {hasEvents && (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className={styles.floatBtn}
                  style={{ marginBottom: "0.5rem" }}
                >
                  이벤트 로그 ({events.length}) →
                </button>
              )}
              <button
                type="button"
                onClick={() => setRecording(true)}
                className={styles.floatBtn}
                style={{ background: "#6d28d9" }}
              >
                {hasEvents ? "▶ 재개" : "▶ 기록 시작"}
              </button>
            </>
          )}
        </div>
      )}

      {modalOpen && (
        <EventLogModal
          events={events}
          serviceCode={serviceCode}
          screenId={screenId}
          screenName={screenName}
          author={author}
          bizCategory={bizCategory}
          level1={level1}
          level2={level2}
          level3={level3}
          level4={level4}
          onDeleteEvent={(id) => setEvents((prev) => prev.filter((e) => e.id !== id))}
          onUpdateEvent={(id, testResult) => setEvents((prev) => prev.map((e) => e.id === id ? { ...e, testResult: testResult || undefined } : e))}
          onUpdateCaseMeta={(caseNumber, patch) => setCaseMetas((prev) => prev.map((m) => m.caseNumber === caseNumber ? { ...m, ...patch } : m))}
          caseMetas={caseMetas}
          onClose={() => setModalOpen(false)}
          onClear={() => {
            setEvents([]);
            seqRef.current = 0;
            setCurrentCaseNumber(1);
            currentCaseNumberRef.current = 1;
            setCaseMetas([{ caseNumber: 1, caseName: "" }]);
            setModalOpen(false);
          }}
          onDownloadComplete={() => {
            setEvents([]);
            seqRef.current = 0;
            setCurrentCaseNumber(1);
            currentCaseNumberRef.current = 1;
            setCaseMetas([{ caseNumber: 1, caseName: "" }]);
            setModalOpen(false);
          }}
          onServiceCodeChange={setServiceCode}
          onScreenIdChange={setScreenId}
          onScreenNameChange={setScreenName}
          onAuthorChange={setAuthor}
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
