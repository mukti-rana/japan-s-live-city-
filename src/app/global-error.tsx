"use client";

import { useEffect } from "react";

// Last-resort boundary: it replaces the root layout, so it renders its own
// <html>/<body>. Per the Next 16 docs this file does NOT receive the app's
// global stylesheet, and the theme class on <html> never reaches it — so the
// deep-black look is written inline here rather than with tokens or Tailwind.
//
// Text is plain English: the i18n provider lives in the root layout, which is
// exactly what has failed by the time this renders.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error.digest ?? "(no digest)", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#0b0e1a",
          color: "#f4f4f8",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <title>Something went wrong — Live City Japan</title>
        <main
          style={{
            width: "100%",
            maxWidth: "440px",
            textAlign: "center",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "16px",
            background: "#0e1324",
            padding: "32px 24px",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 600, letterSpacing: "-0.01em" }}>
            Something went wrong
          </h1>
          <p style={{ margin: "10px 0 0", fontSize: "14px", lineHeight: 1.6, color: "rgba(244,244,248,0.8)" }}>
            Live City Japan could not start. Reloading usually fixes it.
          </p>

          <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <button
              type="button"
              onClick={() => retry()}
              style={{
                height: "44px",
                borderRadius: "12px",
                border: "none",
                background: "#4da3ff",
                color: "#0b0e1a",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Try again
            </button>
            {/* A plain <a>, not next/link: global-error replaces the root layout,
                so the router tree it would navigate inside has already failed.
                A full document load is the only reliable way back. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                height: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                color: "#f4f4f8",
                fontSize: "14px",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Back to home
            </a>
          </div>

          {error.digest && (
            <p style={{ margin: "20px 0 0", fontSize: "12px", color: "#8b8fa3" }}>
              Reference: <code style={{ fontFamily: "ui-monospace, monospace" }}>{error.digest}</code>
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
