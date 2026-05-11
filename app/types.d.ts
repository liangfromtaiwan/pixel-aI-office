export {};

declare global {
  interface Window {
    petBridge?: {
      syncStatus: (status: "idle" | "thinking" | "working" | "blocked" | "done") => Promise<{
        ok: boolean;
      }>;
    };
  }
}
