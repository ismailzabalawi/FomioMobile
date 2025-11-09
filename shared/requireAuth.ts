import { storeIntent, Intent } from "./intent-replay";

export function requireAuth<T extends (...args: any[]) => any>(
  fn: T,
  opts: {
    isAuthenticated: boolean;
    router: { push: (href: string) => void };
    intent?: Intent | (() => Intent);
    signinHref?: string;
  }
): T {
  const { isAuthenticated, router, intent, signinHref = "/(auth)/signin" } = opts;
  return ((...args: Parameters<T>) => {
    if (!isAuthenticated) {
      if (intent) {
        const value = typeof intent === "function" ? (intent as () => Intent)() : intent;
        storeIntent(value);
      }
      router.push(signinHref);
      return undefined as unknown as ReturnType<T>;
    }
    return fn(...args);
  }) as T;
}

