import type { ReactNode } from "react";

/**
 * The phone-frame shell. The design frames each screen as a 412px phone on an
 * app-bg backdrop. On real phones it goes full-bleed; on wider screens we keep
 * the rounded "app" frame. The fake iOS status bar / home indicator from the
 * mock are intentionally dropped (the OS / browser provides chrome).
 */
export function AppShell({
  children,
  bg = "bg-surface-2",
  /** when true the frame is a fixed-height column (for chat-style screens) */
  flexColumn = false,
  overlay = false,
  bare = false,
}: {
  children: ReactNode;
  bg?: string;
  flexColumn?: boolean;
  overlay?: boolean;
  bare?: boolean;
}) {
  if (bare) return <>{children}</>;

  return (
    <div className={["flex min-h-[100svh] min-h-[100dvh] justify-center bg-app-bg sm:py-6", overlay ? "fixed inset-0 z-50 overflow-y-auto" : ""].join(" ")}>
      <div
        className={[
          "relative w-full overflow-hidden shadow-frame sm:max-w-[412px] sm:rounded-frame",
          bg,
          flexColumn
            ? "flex h-[100svh] h-[100dvh] min-h-0 flex-col sm:h-[872px]"
            : "min-h-[100svh] min-h-[100dvh] sm:min-h-0",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}
