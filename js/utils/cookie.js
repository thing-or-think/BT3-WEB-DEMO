import { CONFIG } from '../config.js';

export function setCookie(name = CONFIG.COOKIE_NAME, value, days = CONFIG.COOKIE_DAYS) {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
  try {
    localStorage.setItem(name, value);
  } catch (_) {}
}

export function getCookie(name = CONFIG.COOKIE_NAME) {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim();
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

export function deleteCookie(name = CONFIG.COOKIE_NAME) {
  document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax`;
  try {
    localStorage.removeItem(name);
  } catch (_) {}
}
