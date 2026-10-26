import { state } from './state.js';
import { fetchUserGists, fetchGistDetail } from '../services/github.js';
import { createCommunityChannel, syncCommunityUsersList, reinitPlayHTMLElements } from '../services/playhtml.js';
import { escapeHtml, showError, showSuccess, copyToClipboard } from '../utils/dom.js';
import { detectLanguage, getLangClass, getLangIcon } from '../utils/lang.js';
import { switchTab } from './tabs.js';
import { openCodePreview } from './modal.js';

export { detectLanguage };

let communityPageDataChannel = null;

export function registerUserToCommunity(username) {
  if (!username) return;
  username = username.trim().toLowerCase();

  const isNew = state.addCommunityUser(username);
  renderMemberChips();

  // Đồng bộ lên PlayHTML Realtime
  syncCommunityUsersList(state.communityUsers);

  if (isNew) {
    loadAllCommunityGists();
  }
}

export function initPlayHTMLCommunitySync() {
  communityPageDataChannel = createCommunityChannel(state.communityUsers, (newList) => {
    console.log('⚡ [PlayHTML Community] Nhận danh sách thành viên mới:', newList);
    if (Array.isArray(newList) && newList.length > 0) {
      const isChanged = state.mergeCommunityUsers(newList);
      renderMemberChips();
      if (isChanged) {
        showSuccess(`🎉 Thành viên mới (@${newList[newList.length - 1]}) vừa tham gia!`);
        loadAllCommunityGists();
      }
    }
  });

  // Đẩy user hiện tại lên kênh nếu có
  if (state.currentUser && state.currentUser.login) {
    registerUserToCommunity(state.currentUser.login);
  }

  renderMemberChips();
  loadAllCommunityGists();
}

export function renderMemberChips() {
  const memberCountEl = document.getElementById('member-count');
  const membersChipList = document.getElementById('members-chip-list');
  if (!memberCountEl || !membersChipList) return;

  memberCountEl.textContent = state.communityUsers.length;

  const chipsHtml = [
    `<span class="member-chip ${state.selectedUserFilter === 'all' ? 'active' : ''}" data-user="all">Tất cả (${state.communityUsers.length})</span>`,
    ...state.communityUsers.map(u => `
      <span class="member-chip ${state.selectedUserFilter === u ? 'active' : ''}" data-user="${escapeHtml(u)}">
        @${escapeHtml(u)}
      </span>
    `)
  ].join('');

  membersChipList.innerHTML = chipsHtml;

  // Gắn sự kiện click lọc
  membersChipList.querySelectorAll('.member-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      state.selectedUserFilter = chip.dataset.user;
      membersChipList.querySelectorAll('.member-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderCommunityGistsList();
    });
  });
}

export async function loadAllCommunityGists() {
  const communityFeedList = document.getElementById('community-feed-list');
  if (!communityFeedList) return;

  communityFeedList.innerHTML = `
    <div class="loading-state">
      <span class="status-indicator checking"></span> 
      Đang tổng hợp Gist từ ${state.communityUsers.length} thành viên cộng đồng...
    </div>
  `;

  try {
    const promises = state.communityUsers.map(async (u) => {
      try {
        return await fetchUserGists(u, 6);
      } catch (_) {
        return [];
      }
    });

    const results = await Promise.all(promises);
    state.allCommunityGists = results.flat().sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    renderCommunityGistsList();
  } catch (err) {
    communityFeedList.innerHTML = `<li class="loading-item">Lỗi khi tải Gist. Bấm "Làm Mới" để thử lại.</li>`;
  }
}

export function renderCommunityGistsList() {
  const communityFeedList = document.getElementById('community-feed-list');
  if (!communityFeedList) return;

  let filtered = state.allCommunityGists;
  if (state.selectedUserFilter !== 'all') {
    filtered = state.allCommunityGists.filter(g => (g.author_login || '').toLowerCase() === state.selectedUserFilter.toLowerCase());
  }

  if (filtered.length === 0) {
    communityFeedList.innerHTML = `
      <div class="card" style="text-align: center; padding: 2rem;">
        <p style="color: var(--text-secondary);">Chưa có Gist nào từ ${state.selectedUserFilter === 'all' ? 'các thành viên' : '@' + state.selectedUserFilter}.</p>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem;">Bạn có thể là người đầu tiên đăng bài ở tab "Kho Code Của Tôi"!</p>
      </div>
    `;
    return;
  }

  communityFeedList.innerHTML = filtered.map(g => {
    const firstFile = Object.values(g.files || {})[0] || {};
    const filename = firstFile.filename || 'code.txt';
    const lang = detectLanguage(filename);
    const langClass = getLangClass(lang);
    const icon = getLangIcon(lang);
    const title = g.description || filename;
    const author = g.author_login || (g.owner ? g.owner.login : 'user');
    const timeStr = new Date(g.updated_at).toLocaleDateString('vi-VN');

    return `
      <div class="feed-item">
        <div class="feed-item-header">
          <div class="author-info">
            <span class="author-icon">${icon}</span>
            <div>
              <h3 class="feed-item-title">${escapeHtml(title)}</h3>
              <div class="feed-item-meta">
                Đăng bởi <strong>@${escapeHtml(author)}</strong> • 
                <span class="badge-lang ${langClass}">${escapeHtml(lang)}</span> • 
                <span>${escapeHtml(filename)}</span>
              </div>
            </div>
          </div>
          <span class="feed-time">${timeStr}</span>
        </div>

        <p class="feed-item-desc">${escapeHtml(g.description ? `Mô tả: ${g.description}` : `Bài tập ${filename} được lưu từ GitHub Gist`)}</p>

        <div class="feed-item-actions">
          <div class="action-left">
            <button can-toggle id="like-gist-${g.id}" class="play-reaction-btn">❤️ <span>Thích</span></button>
            <button can-toggle id="star-gist-${g.id}" class="play-reaction-btn">⭐ <span>Hữu ích</span></button>
          </div>
          <div class="action-right">
            <button class="btn btn-outline btn-xs" onclick="fetchAndOpenGist('${g.id}')">👁️ Xem Toàn Bộ</button>
            <button class="btn btn-secondary btn-xs" onclick="copySnippetLink('${g.html_url}')">🔗 Copy Link</button>
            <button class="btn btn-primary btn-xs" onclick="forkGist('${g.id}')">🍴 Fork</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  reinitPlayHTMLElements();
}

export function initFeedModule() {
  const btnOpenQuickShare = document.getElementById('btn-open-quick-share');
  const quickShareBox = document.getElementById('quick-share-box');
  const btnSubmitQuickShare = document.getElementById('btn-submit-quick-share');
  const btnRefreshFeed = document.getElementById('btn-refresh-feed');

  window.toggleQuickShare = (show) => {
    quickShareBox?.classList.toggle('hidden', !show);
  };

  btnOpenQuickShare?.addEventListener('click', () => {
    window.toggleQuickShare(quickShareBox?.classList.contains('hidden'));
  });

  btnRefreshFeed?.addEventListener('click', () => {
    loadAllCommunityGists();
    showSuccess('Đã cập nhật danh sách Gist mới nhất!');
  });

  btnSubmitQuickShare?.addEventListener('click', () => {
    const title = document.getElementById('quick-title')?.value.trim();
    const lang = document.getElementById('quick-lang')?.value;
    const code = document.getElementById('quick-code')?.value.trim();

    if (!title || !code) {
      showError('Vui lòng nhập đầy đủ tiêu đề và nội dung code!');
      return;
    }

    // Đăng bài nhanh lên đầu feed
    const item = document.createElement('div');
    item.className = 'feed-item';
    const langClass = getLangClass(lang);
    const icon = getLangIcon(lang);
    const uniqueId = 'snip-' + Date.now();

    item.innerHTML = `
      <div class="feed-item-header">
        <div class="author-info">
          <span class="author-icon">${icon}</span>
          <div>
            <h3 class="feed-item-title">${escapeHtml(title)}</h3>
            <div class="feed-item-meta">
              Đăng bởi <strong>@${escapeHtml(state.currentUser ? state.currentUser.login : 'Thành viên')}</strong> • 
              <span class="badge-lang ${langClass}">${escapeHtml(lang)}</span>
            </div>
          </div>
        </div>
        <span class="feed-time">Vừa đăng</span>
      </div>
      <p class="feed-item-desc">Chia sẻ nhanh từ cộng đồng</p>
      <pre class="snippet-preview">${escapeHtml(code.slice(0, 220))}</pre>
      <div class="feed-item-actions">
        <div class="action-left">
          <button can-toggle id="like-${uniqueId}" class="play-reaction-btn">❤️ <span>Thích</span></button>
          <button can-toggle id="star-${uniqueId}" class="play-reaction-btn">⭐ <span>Hữu ích</span></button>
        </div>
        <div class="action-right">
          <button class="btn btn-outline btn-xs" onclick="openCodePreview('${escapeHtml(title)}', ${JSON.stringify(code)}, '')">👁️ Xem Toàn Bộ</button>
          <button class="btn btn-secondary btn-xs" onclick="copySnippetCode(${JSON.stringify(code)})">📋 Sao Chép</button>
        </div>
      </div>
    `;

    document.getElementById('community-feed-list')?.prepend(item);
    reinitPlayHTMLElements();

    const titleEl = document.getElementById('quick-title');
    const codeEl = document.getElementById('quick-code');
    if (titleEl) titleEl.value = '';
    if (codeEl) codeEl.value = '';
    window.toggleQuickShare(false);
    showSuccess('Đã đăng thành công lên danh sách cộng đồng!');
  });
}

export async function postGistToCommunityFeed(title, gistId, filename) {
  try {
    const data = await fetchGistDetail(gistId);
    const firstFile = Object.values(data.files || {})[0];
    const code = firstFile ? firstFile.content : '// Trống';
    const lang = detectLanguage(filename);

    showSuccess(`Đã chọn bài "${title}"!`);
    switchTab('tab-feed');
  } catch (err) {
    showError('Không thể tải bài tập để đăng lên Feed.');
  }
}
