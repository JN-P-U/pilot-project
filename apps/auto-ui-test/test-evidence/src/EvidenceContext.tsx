"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

function pathToScreenId(pathname: string): string {
  return (
    pathname
      .split("/")
      .filter(Boolean)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("") || "Main"
  );
}

interface ScreenCtx {
  currentScreenId: string;
  currentScreenName: string;
  setScreen: (id: string, name: string) => void;
  resetScreen: () => void;
}

const EvidenceScreenContext = createContext<ScreenCtx>({
  currentScreenId: "",
  currentScreenName: "",
  setScreen: () => {},
  resetScreen: () => {},
});

export function EvidenceScreenProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [override, setOverride] = useState<{ id: string; name: string } | null>(null);

  const setScreen = useCallback((id: string, name: string) => {
    setOverride({ id, name });
  }, []);

  const resetScreen = useCallback(() => {
    setOverride(null);
  }, []);

  return (
    <EvidenceScreenContext.Provider
      value={{
        currentScreenId: override?.id ?? pathToScreenId(pathname),
        currentScreenName: override?.name ?? "",
        setScreen,
        resetScreen,
      }}
    >
      {children}
    </EvidenceScreenContext.Provider>
  );
}

/** 팝업 컴포넌트 최상단에서 호출 — 마운트 시 등록, 언마운트 시 해제 */
export function useEvidenceScreen(screenId: string, screenName: string) {
  const { setScreen, resetScreen } = useContext(EvidenceScreenContext);
  useEffect(() => {
    setScreen(screenId, screenName);
    return () => resetScreen();
  }, [screenId, screenName, setScreen, resetScreen]);
}

export function useEvidenceScreenCtx() {
  return useContext(EvidenceScreenContext);
}
