export type AuthEvent = "auth:signed-in" | "auth:signed-out" | "auth:refreshed";

const listeners = new Set<(e: AuthEvent) => void>();

export function onAuthEvent(cb: (e: AuthEvent) => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function emitAuthEvent(event: AuthEvent) {
  // Take a snapshot to avoid mutation during iteration
  [...listeners].forEach((l) => {
    try { 
      l(event); 
    } catch (err) {
      console.error("auth event listener error", err);
    }
  });
}

