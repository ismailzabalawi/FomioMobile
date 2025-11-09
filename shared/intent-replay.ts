import { onAuthEvent } from "./auth-events";

export type IntentType = "like" | "comment" | "bookmark";

export type Intent = {
  type: IntentType;
  postId: string;
  payload?: any;
  timestamp: number;
};

const queue: Intent[] = [];

export function storeIntent(intent: Omit<Intent, "timestamp">) {
  queue.push({ ...intent, timestamp: Date.now() });
}

export type IntentHandlers = {
  like?: (postId: string) => Promise<void> | void;
  comment?: (postId: string, payload?: any) => Promise<void> | void;
  bookmark?: (postId: string) => Promise<void> | void;
  onSuccess?: (intent: Intent) => void; // e.g., toast
  onError?: (intent: Intent, error: unknown) => void;
};

export function attachIntentReplay(handlers: IntentHandlers): () => void {
  const unsubscribe = onAuthEvent(async (e) => {
    if (e !== "auth:signed-in") return;
    if (!queue.length) return;

    // Consume snapshot to avoid reentrancy
    const snapshot = [...queue];
    queue.length = 0;

    for (const intent of snapshot) {
      try {
        if (intent.type === "like" && handlers.like) {
          await handlers.like(intent.postId);
        } else if (intent.type === "comment" && handlers.comment) {
          await handlers.comment(intent.postId, intent.payload);
        } else if (intent.type === "bookmark" && handlers.bookmark) {
          await handlers.bookmark(intent.postId);
        }
        handlers.onSuccess?.(intent);
      } catch (err) {
        handlers.onError?.(intent, err);
      }
    }
  });
  
  // Return a cleanup function that calls unsubscribe and returns void
  return () => {
    unsubscribe();
  };
}

