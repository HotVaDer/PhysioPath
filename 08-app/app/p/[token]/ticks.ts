// «Το έκανα σήμερα»: which exercises the patient ticked today, kept only in this browser's localStorage
// (never sent anywhere; the clinic doesn't see them). One key per program link and day, so tomorrow
// starts empty: physiopath:home:<token>:<YYYY-MM-DD>. Yesterday's keys for the same link are removed.
// Storage can be blocked (private mode): then ticks still work on screen, they just aren't remembered.

const PREFIX = "physiopath:home:";

// The local date as YYYY-MM-DD (Swedish formatting happens to be exactly that).
export const today = (now = new Date()) => now.toLocaleDateString("sv");

export const ticksKey = (token: string, day: string) => `${PREFIX}${token}:${day}`;

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadTicks(token: string, day: string, count: number): number[] {
  const store = storage();
  if (!store) return [];
  try {
    // Forget other days of this link (one small key per day would otherwise pile up).
    const mine = `${PREFIX}${token}:`;
    for (let i = store.length - 1; i >= 0; i--) {
      const key = store.key(i);
      if (key?.startsWith(mine) && key !== ticksKey(token, day)) store.removeItem(key);
    }
    const saved: unknown = JSON.parse(store.getItem(ticksKey(token, day)) ?? "[]");
    if (!Array.isArray(saved)) return [];
    return [...new Set(saved)].filter((n): n is number => Number.isInteger(n) && n >= 0 && n < count).sort((a, b) => a - b);
  } catch {
    return [];
  }
}

export function saveTicks(token: string, day: string, ticks: number[]) {
  try {
    storage()?.setItem(ticksKey(token, day), JSON.stringify(ticks));
  } catch {
    // Full or blocked: the ticks stay on screen until the page is closed.
  }
}
