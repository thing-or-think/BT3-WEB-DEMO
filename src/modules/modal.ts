import { state } from './state.js';
import { forkGist } from '../services/github.js';
import { copyToClipboard, showSuccess, showError } from '../utils/dom.js';

export function initModal(): void {
  window.openCodePreview = openCodePreview;
  window.closeCodeModal = closeCodeModal;
  window.copyModalCode = copyModalCode;
  window.forkCurrentModalCode = forkCurrentModalCode;
}

export function openCodePreview(title: string, code: string, gistId: string = ''): void {
  const modal = document.getElementById('code-modal');
  const titleEl = document.getElementById('modal-code-title');
  const codeEl = document.getElementById('modal-code-content')?.querySelector('code');
  const forkBtn = document.getElementById('btn-fork-code');

  state.currentModalCode = code || '';
  state.currentModalGistId = gistId || '';

  if (titleEl) titleEl.textContent = title;
  if (codeEl) codeEl.textContent = code;

  if (forkBtn) {
    forkBtn.style.display = gistId ? 'inline-flex' : 'none';
  }

  modal?.classList.remove('hidden');
}

export function closeCodeModal(): void {
  document.getElementById('code-modal')?.classList.add('hidden');
}

export function copyModalCode(): void {
  copyToClipboard(state.currentModalCode, 'Đã sao chép mã nguồn vào bộ nhớ tạm!');
}

export async function forkCurrentModalCode(): Promise<void> {
  if (!state.currentModalGistId) return;

  if (!confirm('Bạn có muốn sao chép (Fork) đoạn code này về tài khoản GitHub của bạn?')) return;

  try {
    const data = await forkGist(state.currentModalGistId);
    showSuccess(`🎉 Fork thành công! Mã đã lưu vào kho của bạn: ${data.html_url}`);
    setTimeout(() => location.reload(), 1500);
  } catch (err: unknown) {
    const error = err as Error;
    showError(error.message || 'Fork thất bại. Hãy chắc chắn bạn đã đăng nhập!');
  }
}
