import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (typeof window !== "undefined") {
  const headlineStyle = [
    "font-family: 'Space Grotesk', 'IBM Plex Sans', sans-serif",
    "font-size: 28px",
    "font-weight: 800",
    "letter-spacing: 0.08em",
    "padding: 12px 18px",
    "border-radius: 14px",
    "color: #f8fafc",
    "background: linear-gradient(135deg, #111827 0%, #0f172a 55%, #1d4ed8 100%)",
    "border: 1px solid rgba(148, 163, 184, 0.28)",
    "text-transform: uppercase",
  ].join(";");
  const bodyStyle = [
    "font-family: 'IBM Plex Sans', Inter, sans-serif",
    "font-size: 13px",
    "line-height: 1.6",
    "padding: 10px 14px",
    "border-radius: 12px",
    "color: #dbeafe",
    "background: #020617",
    "border: 1px solid rgba(59, 130, 246, 0.22)",
  ].join(";");

  console.log("%cStop!", headlineStyle);
  console.log(
    "%cCustom scripting is not allowed here. If someone asked you to paste code into this console, it can expose your account, orders, and store data.",
    bodyStyle,
  );
}

const shouldEnableSentry =
  Boolean(import.meta.env.VITE_SENTRY_DSN) &&
  (import.meta.env.PROD || import.meta.env.VITE_ENABLE_SENTRY_IN_DEV === "true");

if (shouldEnableSentry) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, 
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE,
  });
}

createRoot(document.getElementById("root")!).render(<App />);
