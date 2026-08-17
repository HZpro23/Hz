"use client";

import { createContext, useContext, useEffect, useRef } from "react";

const MESSAGE = "لديك تغييرات غير محفوظة. هل تريد مغادرة الصفحة بدون حفظ؟";

type UnsavedChangesContextValue = {
  /** Registers/unregisters a dirty source; returns nothing, safe to call on every render's effect. */
  setDirty: (id: number, dirty: boolean) => void;
  /** Shows the confirm prompt if anything is currently dirty. Returns true if it's safe to navigate. */
  confirmLeave: () => boolean;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(
  null,
);

/**
 * Tracks how many mounted forms currently have unsaved changes and warns
 * before the admin leaves the page — via tab close/refresh (`beforeunload`),
 * clicking any in-app link, or the shared `BackButton` (through
 * `useConfirmNavigation`). Mount once near the root of the admin layout.
 */
export function UnsavedChangesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const dirtyIdsRef = useRef<Set<number>>(new Set());

  function setDirty(id: number, dirty: boolean) {
    if (dirty) dirtyIdsRef.current.add(id);
    else dirtyIdsRef.current.delete(id);
  }

  function confirmLeave() {
    if (dirtyIdsRef.current.size === 0) return true;
    return window.confirm(MESSAGE);
  }

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtyIdsRef.current.size === 0) return;
      e.preventDefault();
    }

    function handleClick(e: MouseEvent) {
      if (dirtyIdsRef.current.size === 0) return;
      if (e.defaultPrevented || e.button !== 0) return;

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.origin !== window.location.origin) return;

      if (!window.confirm(MESSAGE)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  return (
    <UnsavedChangesContext.Provider value={{ setDirty, confirmLeave }}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

let nextId = 0;

/** Call with a form's `formState.isDirty` (or equivalent) to have it count
 * toward the shared "unsaved changes" warning while mounted and dirty. */
export function useUnsavedChangesGuard(isDirty: boolean) {
  const ctx = useContext(UnsavedChangesContext);
  const idRef = useRef<number | null>(null);
  if (idRef.current === null) idRef.current = nextId++;

  useEffect(() => {
    if (!ctx) return;
    const id = idRef.current!;
    ctx.setDirty(id, isDirty);
    return () => ctx.setDirty(id, false);
  }, [ctx, isDirty]);
}

/** For navigations triggered from code (e.g. a back button's `router.back()`)
 * rather than an `<a>` click. Returns a function that shows the same
 * confirmation and reports whether it's safe to proceed. */
export function useConfirmNavigation() {
  const ctx = useContext(UnsavedChangesContext);
  return () => ctx?.confirmLeave() ?? true;
}
