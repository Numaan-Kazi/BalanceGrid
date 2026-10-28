const UNLOCKED_STORAGE_KEY = 'balance_grid_unlocked_months';
const UNLOCK_CHANGE_EVENT = 'balance_grid_unlocked_months_changed';

export const getUnlockedMonths = (): string[] => {
  try {
    const raw = localStorage.getItem(UNLOCKED_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const isMonthManuallyUnlocked = (year: number, month: number): boolean => {
  const key = `${year}-${month}`;
  return getUnlockedMonths().includes(key);
};

export const unlockMonth = (year: number, month: number): void => {
  const key = `${year}-${month}`;
  const months = getUnlockedMonths().filter(m => m !== key);
  months.push(key);
  localStorage.setItem(UNLOCKED_STORAGE_KEY, JSON.stringify(months));
  window.dispatchEvent(new Event(UNLOCK_CHANGE_EVENT));
};

export const relockMonth = (year: number, month: number): void => {
  const key = `${year}-${month}`;
  const months = getUnlockedMonths().filter(m => m !== key);
  localStorage.setItem(UNLOCKED_STORAGE_KEY, JSON.stringify(months));
  window.dispatchEvent(new Event(UNLOCK_CHANGE_EVENT));
};

/**
 * Check if the given calendar month has elapsed past the current date
 */
export const isMonthPastCalendar = (year: number, month: number): boolean => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  if (year < currentYear) return true;
  if (year === currentYear && month < currentMonth) return true;
  return false;
};

/**
 * Determine effective closed status:
 * - A month is closed if backend flags it closed OR if current date has passed that calendar month.
 * - However, if the user explicitly clicked "Unlock Month", it is unlocked for editing.
 */
export const isMonthEffectivelyClosed = (
  year: number,
  month: number,
  backendClosed?: boolean
): boolean => {
  const isPast = isMonthPastCalendar(year, month);
  const inherentlyClosed = Boolean(backendClosed || isPast);
  const isUnlocked = isMonthManuallyUnlocked(year, month);
  return inherentlyClosed && !isUnlocked;
};

export const onMonthLockChange = (callback: () => void): (() => void) => {
  window.addEventListener(UNLOCK_CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(UNLOCK_CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
};

