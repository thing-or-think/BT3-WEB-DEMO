import { state } from './state.js';
import { fetchUserGists, fetchGistDetail } from '../services/github.js';
import { 
  createCommunityChannel, 
  syncCommunityUsersList, 
  createSnippetsChannel, 
  getSharedSnippets, 
  broadcastSnippet, 
  reinitPlayHTMLElements 
} from '../services/playhtml.js';
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

  // Kênh đồng bộ các đoạn code chia sẻ realtime
  createSnippetsChannel((newSnippets) => {
    console.log('⚡ [PlayHTML Snippets] Nhận danh sách code mới qua WebSocket:', newSnippets);
    loadAllCommunityGists();
  });

  if (communityPageDataChannel) {
    try {
      // 1. Đọc dữ liệu đã có trên Cloud PartyKit
      const remoteList = communityPageDataChannel.getData();
      console.log('📡 [PlayHTML Community] Dữ liệu hiện tại trên PartyKit:', remoteList);
      if (Array.isArray(remoteList) && remoteList.length > 0) {
        state.mergeCommunityUsers(remoteList);
      }

      // 2. Nếu user hiện tại đang đăng nhập, bổ sung user đó
      if (state.currentUser && state.currentUser.login) {
        state.addCommunityUser(state.currentUser.login);
      }

      // 3. Đẩy danh sách đã hợp nhất đầy đủ lên Cloud để mọi người cùng thấy
      syncCommunityUsersList(state.communityUsers);
    } catch (e) {
      console.warn('⚠️ [PlayHTML Community] Lỗi đọc/ghi ban đầu:', e);
    }
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
    // 1. Lấy danh sách Gist công khai từ GitHub API của các thành viên
    const promises = state.communityUsers.map(async (u) => {
      try {
        return await fetchUserGists(u, 6);
      } catch (_) {
        return [];
      }
    });

    const results = await Promise.all(promises);
    const githubGists = results.flat();

    // 2. Lấy các Snippet được chia sẻ qua kênh PlayHTML Realtime
    const playhtmlSnippets = getSharedSnippets();

    // 3. Hợp nhất hai nguồn và khử trùng lặp theo ID
    const gistMap = new Map();
    githubGists.forEach(g => {
      if (g && g.id) gistMap.set(g.id, g);
    });
    playhtmlSnippets.forEach(s => {
      if (s && s.id && !gistMap.has(s.id)) {
        gistMap.set(s.id, s);
      }
    });

    state.allCommunityGists = Array.from(gistMap.values()).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

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

    const uniqueId = 'snip-' + Date.now();
    const newSnippet = {
      id: uniqueId,
      description: title,
      author_login: state.currentUser ? state.currentUser.login : 'Thành viên',
      files: {
        [title]: { filename: `${title}.${lang.toLowerCase()}`, content: code }
      },
      html_url: '#',
      updated_at: new Date().toISOString()
    };

    // Đẩy lên PlayHTML Shared Snippets để cả cộng đồng đều thấy
    broadcastSnippet(newSnippet);

    const titleEl = document.getElementById('quick-title');
    const codeEl = document.getElementById('quick-code');
    if (titleEl) titleEl.value = '';
    if (codeEl) codeEl.value = '';
    window.toggleQuickShare(false);
    showSuccess('Đã đăng thành công lên danh sách cộng đồng!');
    loadAllCommunityGists();
  });
}

export async function postGistToCommunityFeed(title, gistId, filename) {
  try {
    const data = await fetchGistDetail(gistId);
    broadcastSnippet({
      ...data,
      author_login: state.currentUser ? state.currentUser.login : 'user',
      description: title || data.description,
      updated_at: new Date().toISOString()
    });

    showSuccess(`🎉 Đã đăng bài "${title}" lên danh sách cộng đồng!`);
    switchTab('tab-feed');
    loadAllCommunityGists();
  } catch (err) {
    showError('Không thể tải bài tập để đăng lên Feed.');
  }
}
