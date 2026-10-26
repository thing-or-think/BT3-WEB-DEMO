export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function showError(msg: string): void {
  const errorBanner = document.getElementById('error-banner');
  if (!errorBanner) return;
  errorBanner.textContent = msg;
  errorBanner.classList.remove('hidden');
  setTimeout(() => errorBanner.classList.add('hidden'), 6000);
}

export function showSuccess(msg: string): void {
  const successBanner = document.getElementById('success-banner');
  if (!successBanner) return;
  successBanner.textContent = msg;
  successBanner.classList.remove('hidden');
  setTimeout(() => successBanner.classList.add('hidden'), 5000);
}

export function hideBanners(): void {
  document.getElementById('error-banner')?.classList.add('hidden');
  document.getElementById('success-banner')?.classList.add('hidden');
}

export function copyToClipboard(text: string, successMsg: string = 'Đã sao chép vào bộ nhớ tạm!'): void {
  if (!text) return;
  navigator.clipboard.writeText(text);
  showSuccess(successMsg);
}
