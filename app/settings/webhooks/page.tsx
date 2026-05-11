"use client";

import Link from "next/link";
import { useState } from "react";

const EXAMPLE_PAYLOAD = {
  externalTaskId: "claude_task_001",
  aiToolName: "Claude",
  title: "Landing page copy generation",
  description: "Generate first draft for product landing page",
  status: "in_progress",
  progress: 65,
  currentStage: "Writing first draft",
  log: "Claude is generating section headlines",
};

export default function WebhookSettingsPage() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const endpoint = "/api/tasks/update";
  const absoluteEndpoint =
    typeof window !== "undefined" ? `${window.location.origin}${endpoint}` : `http://localhost:3000${endpoint}`;

  const curl = `curl -X POST ${absoluteEndpoint} \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(EXAMPLE_PAYLOAD, null, 2)}'`;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(absoluteEndpoint);
      setMessage("Webhook URL copied.");
    } catch {
      setMessage("Unable to copy URL.");
    }
  };

  const sendTest = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/tasks/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(EXAMPLE_PAYLOAD),
      });
      if (!res.ok) throw new Error("request failed");
      setMessage("Test webhook sent successfully. Check dashboard refresh.");
    } catch {
      setMessage("Failed to send test webhook.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#d6caa8] p-4 text-[#1f1c16] md:p-6">
      <div className="mx-auto max-w-4xl rounded-2xl border-4 border-[#3a3226] bg-[#f6f0df] shadow-[0_10px_0_#8a7d5f]">
        <header className="border-b-4 border-[#3a3226] bg-[#fff7da] px-5 py-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#6b5f45]">Integration setup</p>
          <h1 className="mt-1 text-2xl font-black">Webhook Setup</h1>
          <p className="mt-1 text-sm font-semibold text-[#4a4436]">
            Send external AI progress updates into this local dashboard without paid services.
          </p>
          <p className="mt-2 text-xs">
            <Link className="underline" href="/">
              Back to dashboard
            </Link>
          </p>
        </header>

        <section className="space-y-4 p-5">
          <div className="rounded-xl border-2 border-black/15 bg-white/70 p-3">
            <p className="text-xs font-black uppercase tracking-wide text-[#6b5f45]">Webhook endpoint URL</p>
            <code className="mt-1 block rounded bg-[#efe7d1] px-2 py-1 text-sm">{endpoint}</code>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyUrl()}
                className="rounded-lg border-2 border-[#2f6aa3] bg-[#d9ecff] px-3 py-1.5 text-xs font-black uppercase text-[#1b3f63]"
              >
                Copy webhook URL
              </button>
              <button
                type="button"
                onClick={() => void sendTest()}
                disabled={sending}
                className="rounded-lg border-2 border-[#2f7a4a] bg-[#daf5e3] px-3 py-1.5 text-xs font-black uppercase text-[#1f4d30] disabled:opacity-60"
              >
                {sending ? "Sending..." : "Send test webhook"}
              </button>
            </div>
            {message ? <p className="mt-2 text-xs font-semibold text-[#4a4436]">{message}</p> : null}
          </div>

          <div className="rounded-xl border-2 border-black/15 bg-white/70 p-3">
            <p className="text-xs font-black uppercase tracking-wide text-[#6b5f45]">Example curl</p>
            <pre className="mt-1 overflow-x-auto rounded bg-[#201d18] p-3 text-xs text-[#f8f1df]">{curl}</pre>
          </div>

          <div className="rounded-xl border-2 border-black/15 bg-white/70 p-3">
            <p className="text-xs font-black uppercase tracking-wide text-[#6b5f45]">Example payload</p>
            <pre className="mt-1 overflow-x-auto rounded bg-[#efe7d1] p-3 text-xs text-[#2a2620]">
              {JSON.stringify(EXAMPLE_PAYLOAD, null, 2)}
            </pre>
          </div>

          <div className="rounded-xl border-2 border-black/15 bg-white/70 p-3">
            <p className="text-xs font-black uppercase tracking-wide text-[#6b5f45]">How to connect tools</p>
            <ul className="mt-2 space-y-1 text-sm font-semibold text-[#2a2620]">
              <li>Use Zapier / Make / n8n / script to POST JSON to the webhook endpoint.</li>
              <li>Reuse the same `externalTaskId` to update the same task over time.</li>
              <li>Set `status` and `progress`; backend normalizes completed/not_started automatically.</li>
              <li>Add `log` on each update to append activity history.</li>
              <li>On dashboard, click Refresh or enable Auto Sync to pull latest task state.</li>
            </ul>
          </div>

          <div className="rounded-xl border-2 border-black/15 bg-white/70 p-3">
            <p className="text-xs font-black uppercase tracking-wide text-[#6b5f45]">Make quick setup</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm font-semibold text-[#2a2620]">
              <li>Expose local app with ngrok/cloudflared (Make cannot call localhost directly).</li>
              <li>In Make: Trigger (Webhook/Scheduler) → HTTP module (POST).</li>
              <li>HTTP URL: <code className="rounded bg-[#efe7d1] px-1">{endpoint}</code> on your public tunnel domain.</li>
              <li>Body JSON fields: externalTaskId, aiToolName, title, description, status, progress, currentStage, log.</li>
              <li>Run once, then verify dashboard auto-syncs updates.</li>
            </ol>
            <p className="mt-2 text-xs font-semibold text-[#4a4436]">
              Full Make docs in <code className="rounded bg-[#efe7d1] px-1">scripts/make/README.md</code>.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

