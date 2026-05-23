import { listen, UnlistenFn } from "@tauri-apps/api/event";
import type { ProgressEvent } from "../types/conversion";

export const onJobProgress = (
  handler: (event: ProgressEvent) => void
): Promise<UnlistenFn> =>
  listen<ProgressEvent>("job://progress", (e) => handler(e.payload));

export const onJobDone = (
  handler: (jobId: string) => void
): Promise<UnlistenFn> =>
  listen<string>("job://done", (e) => handler(e.payload));
