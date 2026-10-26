import { fetchTargetUserProfile, fetchUserGists, fetchGistDetail } from '../services/github.js';
import { openCodePreview } from './modal.js';
import { escapeHtml, showError } from '../utils/dom.js';
import { GitHubUser, GitHubGist } from '../types/index.js';

export async function fetchAndOpenGist(gistId: string): Promise<void> {
  try {
    const gist = await fetchGistDetail(gistId);
    const firstFile = Object.values(gist.files || {})[0];
    const codeContent = firstFile?.content || '// Trống';
    const title = gist.description || (firstFile ? firstFile.filename : 'Snippet');

    openCodePreview(title, codeContent, gist.id);
  } catch (_) {
    showError('Không thể mở nội dung bài tập.');
  }
}

export function renderTargetUserResults(user: GitHubUser, gists: GitHubGist[]): void {
  const targetUserHeader = document.getElementById('target-user-header');
  const targetGistsList = document.getElementById('target-gists-list');
  if (!targetUserHeader || !targetGistsList) return;

  targetUserHeader.innerHTML = `
    <img src="${user.avatar_url}" alt="Avatar" class="avatar" style="width: 46px; height: 46px;" />
    <div style="flex: 1;">
      <h3 style="font-size: 1rem;">${escapeHtml(user.name || user.login)} (@${escapeHtml(user.login)})</h3>
      <p style="font-size: 0.8rem; color: var(--text-secondary);">${escapeHtml(user.bio || 'Người dùng GitHub')}</p>
    </div>
    <div style="font-size: 0.8rem; text-align: right;">
      <strong>${gists.length}</strong> Gists công khai
    </div>
  `;

  if (!gists || gists.length === 0) {
    targetGistsList.innerHTML = `<li class="loading-item">Người dùng này chưa có Gist public nào.</li>`;
    return;
  }

  targetGistsList.innerHTML = gists.map(g => {
    const fileNames = Object.keys(g.files || {}).join(', ') || 'snippet';
    const desc = g.description || fileNames;
    return `
      <li class="gist-item">
        <div>
          <a href="javascript:void(0)" onclick="fetchAndOpenGist('${g.id}')"><strong>${escapeHtml(desc)}</strong></a>
          <div class="gist-files">📄 ${escapeHtml(fileNames)} • Cập nhật: ${new Date(g.updated_at).toLocaleDateString('vi-VN')}</div>
        </div>
        <div style="display: flex; gap: 0.4rem;">
          <button class="btn btn-outline btn-xs" onclick="fetchAndOpenGist('${g.id}')">Xem Code</button>
          <button class="btn btn-primary btn-xs" onclick="forkGist('${g.id}')">🍴 Fork</button>
        </div>
      </li>
    `;
  }).join('');
}

export function initSearchModule(): void {
  const searchUserForm = document.getElementById('search-user-form') as HTMLFormElement | null;
  const targetUsernameInput = document.getElementById('target-username-input') as HTMLInputElement | null;
  const btnSearchUser = document.getElementById('btn-search-user') as HTMLButtonElement | null;
  const searchLoading = document.getElementById('search-loading');
  const searchResultsWrapper = document.getElementById('search-results-wrapper');

  searchUserForm?.addEventListener('submit', async (e: Event) => {
    e.preventDefault();
    const targetUser = targetUsernameInput?.value.trim().replace(/^@/, '');
    if (!targetUser) return;

    if (btnSearchUser) btnSearchUser.disabled = true;
    searchLoading?.classList.remove('hidden');
    searchResultsWrapper?.classList.add('hidden');

    try {
      const targetData = await fetchTargetUserProfile(targetUser);
      const targetGists = await fetchUserGists(targetUser, 30);

      renderTargetUserResults(targetData, targetGists);
      searchResultsWrapper?.classList.remove('hidden');
    } catch (err: unknown) {
      const error = err as Error;
      showError(error.message || 'Lỗi khi tìm kiếm người dùng GitHub.');
    } finally {
      searchLoading?.classList.add('hidden');
      if (btnSearchUser) btnSearchUser.disabled = false;
    }
  });
}
