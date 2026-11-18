const THEME_STORAGE_KEY = 'sissy-agenda-theme';
const DARK_THEME_COLOR = '#121312';
const LIGHT_THEME_COLOR = '#F2EFE8';

/** The salon workspace opens in its dark palette unless the user chose light. */
export function initialDarkMode(): boolean {
  try {
    return globalThis.localStorage?.getItem(THEME_STORAGE_KEY) !== 'light';
  } catch {
    return true;
  }
}

/** Persist the explicit choice when available and keep browser chrome in sync. */
export function saveThemePreference(dark: boolean): void {
  try {
    globalThis.localStorage?.setItem(THEME_STORAGE_KEY, dark ? 'dark' : 'light');
  } catch {
    // The in-memory theme still changes when browser storage is unavailable.
  }
  syncThemeColor(dark);
}

export function syncThemeColor(dark: boolean): void {
  if (typeof document === 'undefined') return;
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
}
