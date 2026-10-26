import { CONFIG } from '../config.js';

export function setCookie(name: string = CONFIG.COOKIE_NAME, value: string, days: number = CONFIG.COOKIE_DAYS): void {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
  try {
    localStorage.setItem(name, value);
  } catch (_) {}
}

export function getCookie(name: string = CONFIG.COOKIE_NAME): string | null {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    const c = ca[i].trim();
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length));
    }
  }
  try {
    return localStorage.getItem(name);
  } catch (_) {
    return null;
  }
}

export function deleteCookie(name: string = CONFIG.COOKIE_NAME): void {
  document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax`;
  try {
    localStorage.removeItem(name);
  } catch (_) {}
}
