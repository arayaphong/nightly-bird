const BEST_KEY = 'rbn-best';
export function loadBest() {
  try {
    return +localStorage.getItem(BEST_KEY) || 0;
  } catch {
    return 0;
  }
}
export function saveBest(value) {
  try {
    localStorage.setItem(BEST_KEY, value);
  } catch {
    /* Storage can be unavailable in private browsing. */
  }
}
