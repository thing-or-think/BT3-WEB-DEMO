export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function showError(msg) {
  const errorBanner = document.getElementById('error-banner');
  if (!errorBanner) return;
  errorBanner.textContent = msg;
  errorBanner.classList.remove('hidden');
  setTimeout(() => errorBanner.classList.add('hidden'), 6000);
}

export function showSuccess(msg) {
  const successBanner = document.getElementById('success-banner');
  if (!successBanner) return;
  successBanner.textContent = msg;
  successBanner.classList.remove('hidden');
  setTimeout(() => successBanner.classList.add('hidden'), 5000);
}

export function hideBanners() {
  document.getElementById('error-banner')?.classList.add('hidden');
  document.getElementById('success-banner')?.classList.add('hidden');
}

export function copyToClipboard(text, successMsg = 'Đã sao chép vào bộ nhớ tạm!') {
  if (!text) return;
  navigator.clipboard.writeText(text);
  showSuccess(successMsg);
}
