import { state } from './state.js';
import { getCookie } from '../utils/cookie.js';
import { createGist } from '../services/github.js';
import { escapeHtml, showError, showSuccess } from '../utils/dom.js';
import { checkAuthSession } from './auth.js';
import { switchTab } from './tabs.js';
import { fetchAndOpenGist } from './search.js';
import { postGistToCommunityFeed, detectLanguage } from './feed.js';
import { broadcastSnippet } from '../services/playhtml.js';
import { GitHubGist } from '../types/index.js';

export function renderUserGists(gists: GitHubGist[]): void {
  const gistsList = document.getElementById('gists-list');
  if (!gistsList) return;

  if (!gists || gists.length === 0) {
    gistsList.innerHTML = `<li class="loading-item">Chưa có Gist nào. Soạn code bên trên để tạo bài đầu tiên!</li>`;
    return;
  }

  gistsList.innerHTML = gists.map(g => {
    const fileNames = Object.keys(g.files || {}).join(', ') || 'snippet';
    const desc = g.description || fileNames;
    const createdAt = g.created_at ? new Date(g.created_at).toLocaleDateString('vi-VN') : 'Gần đây';
    return `
      <li class="gist-item">
        <div>
          <a href="javascript:void(0)" onclick="fetchAndOpenGist('${g.id}')"><strong>${escapeHtml(desc)}</strong></a>
          <div class="gist-files">📄 ${escapeHtml(fileNames)} • ${createdAt}</div>
        </div>
        <div style="display: flex; gap: 0.4rem;">
          <button class="btn btn-outline btn-xs" onclick="fetchAndOpenGist('${g.id}')">Xem</button>
          <button class="btn btn-secondary btn-xs" onclick="postGistToCommunityFeed('${escapeHtml(desc)}', '${g.id}', '${escapeHtml(fileNames)}')">🌐 Đăng Lên Feed</button>
        </div>
      </li>
    `;
  }).join('');
}

async function performSaveGist(): Promise<{ data: GitHubGist; title: string; filename: string; code: string } | null> {
  const token = getCookie();
  if (!token) {
    showError('Bạn cần đăng nhập để lưu code lên GitHub!');
    return null;
  }

  const title = (document.getElementById('snippet-title') as HTMLInputElement)?.value.trim() || '';
  const filename = (document.getElementById('snippet-filename') as HTMLInputElement)?.value.trim() || 'code.txt';
  const code = (document.getElementById('snippet-code') as HTMLTextAreaElement)?.value || '';

  const data = await createGist({ title, filename, code, isPublic: true }, token);
  return { data, title, filename, code };
}

export function initEditorModule(): void {
  const saveSnippetForm = document.getElementById('save-snippet-form') as HTMLFormElement | null;
  const btnSaveCode = document.getElementById('btn-save-code') as HTMLButtonElement | null;
  const btnSaveAndPin = document.getElementById('btn-save-and-pin') as HTMLButtonElement | null;
  const saveResult = document.getElementById('save-result');

  // Lưu Gist thông thường
  saveSnippetForm?.addEventListener('submit', async (e: Event) => {
    e.preventDefault();
    if (btnSaveCode) {
      btnSaveCode.disabled = true;
      btnSaveCode.textContent = '⏳ Đang lưu lên GitHub...';
    }

    try {
      const result = await performSaveGist();
      if (!result) return;

      if (saveResult) {
        saveResult.innerHTML = `
          <div style="color: #3fb950; font-weight: 600; margin-bottom: 0.3rem;">
            ✅ Code đã được lưu trực tiếp vào GitHub Gist của bạn!
          </div>
          <div>Link xem: <a href="${result.data.html_url}" target="_blank" rel="noopener">${result.data.html_url} ↗</a></div>
        `;
        saveResult.classList.remove('hidden');
      }
      setTimeout(checkAuthSession, 1200);
    } catch (err: unknown) {
      const error = err as Error;
      showError(error.message || 'Lỗi khi lưu Gist.');
    } finally {
      if (btnSaveCode) {
        btnSaveCode.disabled = false;
        btnSaveCode.textContent = '💾 Lưu vào GitHub Gist';
      }
    }
  });

  // Lưu & Đăng lên Danh Sách Cộng Đồng
  btnSaveAndPin?.addEventListener('click', async () => {
    btnSaveAndPin.disabled = true;
    btnSaveAndPin.textContent = '⏳ Đang lưu & đăng bài...';

    try {
      const result = await performSaveGist();
      if (!result) return;

      // Broadcast ngay lên PlayHTML Shared Snippets
      broadcastSnippet({
        ...result.data,
        author_login: state.currentUser ? state.currentUser.login : 'user',
        description: result.title,
        updated_at: new Date().toISOString()
      });

      showSuccess('🎉 Đã lưu vào GitHub và đăng lên Danh sách Cộng đồng!');
      switchTab('tab-feed');
      setTimeout(checkAuthSession, 1200);
    } catch (err: unknown) {
      const error = err as Error;
      showError(error.message || 'Lỗi khi lưu & đăng bài.');
    } finally {
      btnSaveAndPin.disabled = false;
      btnSaveAndPin.textContent = '📌 Lưu & Đăng Lên Danh Sách Cộng Đồng';
    }
  });
}

/**
 * Nạp sẵn Code Bot mẫu thi đấu OTTv2 vào Tab Soạn Thảo (Editor)
 */
export function loadBotTemplateIntoEditor(tag: string = '#ottv2_contest_2026_s1'): void {
  const titleInput = document.getElementById('snippet-title') as HTMLInputElement | null;
  const filenameInput = document.getElementById('snippet-filename') as HTMLInputElement | null;
  const codeTextarea = document.getElementById('snippet-code') as HTMLTextAreaElement | null;

  if (titleInput) {
    titleInput.value = `Bot dự thi OTTv2 Battlecode ${tag}`;
  }
  if (filenameInput) {
    filenameInput.value = 'ottv2_bot.js';
  }
  if (codeTextarea) {
    codeTextarea.value = `// ==========================================
// OTTv2 9x9 BATTLECODE BOT TEMPLATE
// Tag cuộc thi: ${tag}
// ==========================================

function decideMove(gameState, myColor, allMoves) {
  // 1. Kiểm tra nếu có nước đi tiến thẳng vào căn cứ địch -> Đi ngay để THẮNG!
  const enemyBase = myColor === 'red' ? { col: 8, row: 8 } : { col: 0, row: 0 };
  const winMove = allMoves.find(m => m.to.col === enemyBase.col && m.to.row === enemyBase.row);
  if (winMove) return winMove;

  // 2. Tìm các nước đi ăn quân đối phương (Búa > Kéo > Bao > Búa)
  const captureMoves = allMoves.filter(m => {
    const target = gameState.grid[m.to.row][m.to.col];
    return target && target.color !== myColor;
  });

  if (captureMoves.length > 0) {
    return captureMoves[0];
  }

  // 3. Tiến gần về phía căn cứ đối phương nhất
  allMoves.sort((a, b) => {
    const distA = Math.max(Math.abs(a.to.col - enemyBase.col), Math.abs(a.to.row - enemyBase.row));
    const distB = Math.max(Math.abs(b.to.col - enemyBase.col), Math.abs(b.to.row - enemyBase.row));
    return distA - distB;
  });

  return allMoves[0];
}`;
  }

  switchTab('tab-editor');
  showSuccess(`Đã tạo sẵn mẫu Bot nộp thi với tag ${tag}. Hãy chỉnh sửa và bấm "Lưu vào GitHub Gist"!`);
}
