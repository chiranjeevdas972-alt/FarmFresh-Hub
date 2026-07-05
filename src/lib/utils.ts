import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// In-memory fallback dictionary in case window.localStorage is blocked inside restricted iframes
const memoryStore: Record<string, string> = {};

export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`safeLocalStorage.getItem: Failed to read key "${key}" from localStorage (blocked in sandbox/iframe).`, e);
    }
    return memoryStore[key] !== undefined ? memoryStore[key] : null;
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      console.warn(`safeLocalStorage.setItem: Failed to write key "${key}" to localStorage (blocked in sandbox/iframe).`, e);
    }
    memoryStore[key] = value;
  },
  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch (e) {
      console.warn(`safeLocalStorage.removeItem: Failed to delete key "${key}" from localStorage (blocked in sandbox/iframe).`, e);
    }
    delete memoryStore[key];
  },
  clear(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
        return;
      }
    } catch (e) {
      console.warn("safeLocalStorage.clear: Failed to clear localStorage (blocked in sandbox/iframe).", e);
    }
    Object.keys(memoryStore).forEach(key => delete memoryStore[key]);
  }
};
