// =========================================================================
// QUẢN LÝ COOKIE PHIÊN (LƯU TRỮ TRÌNH DUYỆT 30 NGÀY)
// =========================================================================
const COOKIE_NAME = 'gh_token';
const COOKIE_DAYS = 30;

function setCookie(name, value, days) {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
  try {
    localStorage.setItem(name, value);
  } catch (_) {}
}

function getCookie(name) {
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

function deleteCookie(name) {
  document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax`;
  try {
    localStorage.removeItem(name);
  } catch (_) {}
}

// Global modal state
let currentModalCode = '';
let currentModalGistId = '';
let currentUser = null;

// =========================================================================
// KHỞI CHẠY ỨNG DỤNG
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Navigation Tabs
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.tab;
      navTabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add('active');
    });
  });

  // UI Elements
  const headerStatus = document.getElementById('header-user-status');
  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');
  const errorBanner = document.getElementById('error-banner');
  const successBanner = document.getElementById('success-banner');

  // Form Elements
  const patForm = document.getElementById('pat-form');
  const patInput = document.getElementById('pat-input');
  const btnSavePat = document.getElementById('btn-save-pat');
  const btnLogout = document.getElementById('btn-logout');
  const btnReload = document.getElementById('btn-reload');
  const btnOAuthLogin = document.getElementById('btn-oauth-login');

  // Gist Form
  const saveSnippetForm = document.getElementById('save-snippet-form');
  const btnSaveCode = document.getElementById('btn-save-code');
  const btnSaveAndPin = document.getElementById('btn-save-and-pin');
  const saveResult = document.getElementById('save-result');
  const gistsList = document.getElementById('gists-list');

  // User Profile
  const userAvatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');
  const userLogin = document.getElementById('user-login');
  const userBio = document.getElementById('user-bio');
  const statRepos = document.getElementById('stat-repos');
  const statGists = document.getElementById('stat-gists');
  const statFollowers = document.getElementById('stat-followers');
  const userLink = document.getElementById('user-link');

  // Tab 2: Feed Elements & PlayHTML Community Sync
  const communityFeedList = document.getElementById('community-feed-list');
  const btnOpenQuickShare = document.getElementById('btn-open-quick-share');
  const quickShareBox = document.getElementById('quick-share-box');
  const btnSubmitQuickShare = document.getElementById('btn-submit-quick-share');
  const btnRefreshFeed = document.getElementById('btn-refresh-feed');
  const memberCountEl = document.getElementById('member-count');
  const membersChipList = document.getElementById('members-chip-list');

  // Quản lý danh sách thành viên cộng đồng được đồng bộ qua PlayHTML
  let communityUsers = getLocalCommunityUsers();
  let communityPageData = null;
  let allCommunityGists = [];
  let selectedUserFilter = 'all';

  function getLocalCommunityUsers() {
    try {
      const saved = JSON.parse(localStorage.getItem('playhtml_cached_community_users'));
      if (Array.isArray(saved) && saved.length > 0) {
        return [...new Set(['thing-or-think', ...saved])];
      }
    } catch (_) {}
    return ['thing-or-think'];
  }

  function saveLocalCommunityUsers(users) {
    try {
      localStorage.setItem('playhtml_cached_community_users', JSON.stringify(users));
    } catch (_) {}
  }

  // Tab 3: Search User Elements
  const searchUserForm = document.getElementById('search-user-form');
  const targetUsernameInput = document.getElementById('target-username-input');
  const btnSearchUser = document.getElementById('btn-search-user');
  const searchLoading = document.getElementById('search-loading');
  const searchResultsWrapper = document.getElementById('search-results-wrapper');
  const targetUserHeader = document.getElementById('target-user-header');
  const targetGistsList = document.getElementById('target-gists-list');

  // 1. Kiểm tra tham số Deep-Link (Ví dụ: ?gist=ID)
  const urlParams = new URLSearchParams(window.location.search);
  const gistQuery = urlParams.get('gist');
  if (gistQuery) {
    fetchAndOpenGist(gistQuery);
  }

  // Khởi tạo ngay lập tức danh sách thành viên và feed từ local state
  renderMemberChips();
  loadAllCommunityGists();

  // Khởi tạo PlayHTML sync nếu đã sẵn sàng, hoặc đợi playhtml engine load xong
  if (window.playhtml && typeof window.playhtml.createPageData === 'function') {
    window.initPlayHTMLCommunitySync();
  } else {
    let playAttempts = 0;
    const playTimer = setInterval(() => {
      playAttempts++;
      if (window.playhtml && typeof window.playhtml.createPageData === 'function') {
        clearInterval(playTimer);
        window.initPlayHTMLCommunitySync();
      } else if (playAttempts > 40) {
        clearInterval(playTimer);
      }
    }, 100);
  }

  // 2. Kiểm tra Cookie đăng nhập phiên 30 ngày
  checkAuthSession();

  async function checkAuthSession() {
    headerStatus.innerHTML = `<span class="status-indicator checking"></span> Đang kiểm tra Cookie phiên...`;
    const token = getCookie(COOKIE_NAME);

    if (!token) {
      // Fallback kiểm tra server nếu chạy localhost
      try {
        const res = await fetch('/api/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            currentUser = data.user;
            return renderAuthenticatedUI(data.user, data.gists);
          }
        }
      } catch (_) {}

      renderUnauthenticatedUI();
      return;
    }

    try {
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json'
        }
      });

      if (!userRes.ok) {
        deleteCookie(COOKIE_NAME);
        renderUnauthenticatedUI();
        showError('Phiên đăng nhập trong Cookie đã hết hạn trên GitHub.');
        return;
      }

      currentUser = await userRes.json();
      registerUserToCommunity(currentUser.login);

      let gists = [];
      try {
        const gistsRes = await fetch('https://api.github.com/gists?per_page=6', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json'
          }
        });
        if (gistsRes.ok) gists = await gistsRes.json();
      } catch (_) {}

      renderAuthenticatedUI(currentUser, gists);
    } catch (err) {
      console.error(err);
      renderUnauthenticatedUI();
    }
  }

  function renderAuthenticatedUI(user, gists = []) {
    headerStatus.innerHTML = `<span class="status-indicator online"></span> Đã kết nối: <strong>@${user.login}</strong> (Cookie 30 ngày)`;
    loginView.classList.add('hidden');
    dashboardView.classList.remove('hidden');

    userAvatar.src = user.avatar_url;
    userName.textContent = user.name || user.login;
    userLogin.textContent = `@${user.login}`;
    userBio.textContent = user.bio || 'Chưa có tiểu sử trên GitHub.';
    statRepos.textContent = user.public_repos ?? 0;
    statGists.textContent = user.public_gists ?? 0;
    statFollowers.textContent = user.followers ?? 0;
    userLink.href = user.html_url;

    renderGists(gists);
  }

  function renderUnauthenticatedUI() {
    headerStatus.innerHTML = `<span class="status-indicator offline"></span> Khách (Chưa đăng nhập)`;
    loginView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
  }

  function renderGists(gists) {
    if (!gists || gists.length === 0) {
      gistsList.innerHTML = `<li class="loading-item">Chưa có Gist nào. Soạn code bên trên để tạo bài đầu tiên!</li>`;
      return;
    }

    gistsList.innerHTML = gists.map(g => {
      const fileNames = Object.keys(g.files || {}).join(', ') || 'snippet';
      const desc = g.description || fileNames;
      return `
        <li class="gist-item">
          <div>
            <a href="javascript:void(0)" onclick="fetchAndOpenGist('${g.id}')"><strong>${escapeHtml(desc)}</strong></a>
            <div class="gist-files">📄 ${escapeHtml(fileNames)} • ${new Date(g.created_at).toLocaleDateString('vi-VN')}</div>
          </div>
          <div style="display: flex; gap: 0.4rem;">
            <button class="btn btn-outline btn-xs" onclick="fetchAndOpenGist('${g.id}')">Xem</button>
            <button class="btn btn-secondary btn-xs" onclick="postGistToCommunityFeed('${escapeHtml(desc)}', '${g.id}', '${escapeHtml(fileNames)}')">🌐 Đăng Lên Feed</button>
          </div>
        </li>
      `;
    }).join('');
  }

  // 3. Xử lý Đăng nhập PAT
  patForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = patInput.value.trim();
    if (!token) return;

    btnSavePat.disabled = true;
    btnSavePat.textContent = 'Đang xác thực & Lưu Cookie...';
    hideBanners();

    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json'
        }
      });

      if (!res.ok) {
        showError('Token GitHub không hợp lệ hoặc đã bị thu hồi!');
        return;
      }

      currentUser = await res.json();
      registerUserToCommunity(currentUser.login);
      setCookie(COOKIE_NAME, token, COOKIE_DAYS);
      showSuccess(`🎉 Xin chào @${currentUser.login}! Cookie phiên đã được lưu 30 ngày.`);
      patInput.value = '';
      await checkAuthSession();
    } catch (err) {
      console.error(err);
      showError('Lỗi kết nối khi gửi token.');
    } finally {
      btnSavePat.disabled = false;
      btnSavePat.textContent = 'Xác nhận & Lưu Cookie 30 Ngày';
    }
  });

  // 4. Xử lý Nút OAuth
  if (btnOAuthLogin) {
    btnOAuthLogin.addEventListener('click', () => {
      if (window.location.hostname.endsWith('github.io')) {
        showError('💡 GitHub Pages là web tĩnh. Vui lòng dùng [Cách 2: Nhập Token PAT] bên phải để lưu Cookie 30 ngày!');
        patInput.focus();
        patInput.style.borderColor = '#58a6ff';
        return;
      }
      window.location.href = '/api/auth/github';
    });
  }

  // 5. Test F5 & Đăng xuất
  btnReload.addEventListener('click', () => location.reload());
  btnLogout.addEventListener('click', () => {
    if (!confirm('Xóa Cookie và đăng xuất?')) return;
    deleteCookie(COOKIE_NAME);
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    showSuccess('Đã xóa Cookie thành công.');
    currentUser = null;
    renderUnauthenticatedUI();
  });

  // 6. Xử lý Lưu Snippet vào Gist
  async function performSaveGist() {
    const token = getCookie(COOKIE_NAME);
    if (!token) {
      showError('Bạn cần đăng nhập để lưu code lên GitHub!');
      return null;
    }

    const title = document.getElementById('snippet-title').value.trim();
    const filename = document.getElementById('snippet-filename').value.trim();
    const code = document.getElementById('snippet-code').value;

    const res = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json'
      },
      body: JSON.stringify({
        description: title || 'Snippet lưu từ Web Demo',
        public: true,
        files: { [filename]: { content: code } }
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi khi lưu Gist!');
    return { data, title, filename, code };
  }

  saveSnippetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    btnSaveCode.disabled = true;
    btnSaveCode.textContent = '⏳ Đang lưu lên GitHub...';

    try {
      const result = await performSaveGist();
      if (!result) return;

      saveResult.innerHTML = `
        <div style="color: #3fb950; font-weight: 600; margin-bottom: 0.3rem;">
          ✅ Code đã được lưu trực tiếp vào GitHub Gist của bạn!
        </div>
        <div>Link xem: <a href="${result.data.html_url}" target="_blank" rel="noopener">${result.data.html_url} ↗</a></div>
      `;
      saveResult.classList.remove('hidden');
      setTimeout(checkAuthSession, 1200);
    } catch (err) {
      showError(err.message || 'Lỗi khi lưu Gist.');
    } finally {
      btnSaveCode.disabled = false;
      btnSaveCode.textContent = '💾 Lưu vào GitHub Gist';
    }
  });

  // Nút: "Lưu & Đăng Lên Danh Sách Cộng Đồng"
  btnSaveAndPin.addEventListener('click', async () => {
    btnSaveAndPin.disabled = true;
    btnSaveAndPin.textContent = '⏳ Đang lưu & đăng bài...';

    try {
      const result = await performSaveGist();
      if (!result) return;

      // Thêm bài mới vào danh sách Feed
      addSnippetToCommunityFeed({
        title: result.title,
        author: currentUser ? currentUser.login : 'user',
        desc: `File: ${result.filename} • Đoạn code vừa được lưu vào Gist`,
        code: result.code,
        gistId: result.data.id,
        lang: detectLanguage(result.filename)
      });

      showSuccess('🎉 Đã lưu vào GitHub và đăng lên Danh sách Cộng đồng!');
      // Chuyển sang Tab Feed để xem
      document.querySelector('[data-tab="tab-feed"]').click();
      setTimeout(checkAuthSession, 1200);
    } catch (err) {
      showError(err.message || 'Lỗi khi lưu & đăng bài.');
    } finally {
      btnSaveAndPin.disabled = false;
      btnSaveAndPin.textContent = '📌 Lưu & Đăng Lên Danh Sách Cộng Đồng';
    }
  });

  // 7. QUẢN LÝ DANH SÁCH FEED CỘNG ĐỒNG & ĐỒNG BỘ PLAYHTML
  window.toggleQuickShare = function(show) {
    if (show) {
      quickShareBox.classList.remove('hidden');
    } else {
      quickShareBox.classList.add('hidden');
    }
  };

  btnOpenQuickShare.addEventListener('click', () => {
    toggleQuickShare(quickShareBox.classList.contains('hidden'));
  });

  if (btnRefreshFeed) {
    btnRefreshFeed.addEventListener('click', () => {
      loadAllCommunityGists();
      showSuccess('Đã cập nhật danh sách Gist mới nhất!');
    });
  }

  // Đăng ký một username mới vào PlayHTML & Local State
  function registerUserToCommunity(username) {
    if (!username) return;
    username = username.trim().toLowerCase();

    if (!communityUsers.includes(username)) {
      communityUsers = [...new Set([...communityUsers, username])];
      saveLocalCommunityUsers(communityUsers);
    }

    renderMemberChips();

    // Đồng bộ ngay lập tức qua PlayHTML nếu đã kết nối
    if (communityPageData) {
      try {
        const remote = communityPageData.getData();
        const remoteList = Array.isArray(remote) ? remote : [];
        const merged = [...new Set([...remoteList, ...communityUsers, username])];
        communityPageData.setData(merged);
        console.log('✅ [PlayHTML] Đã đồng bộ username lên server:', username, merged);
      } catch (e) {
        console.warn('⚠️ [PlayHTML] Lỗi setData:', e);
      }
    }

    loadAllCommunityGists();
  }

  // Khởi tạo kênh dữ liệu PlayHTML cho danh sách thành viên
  window.initPlayHTMLCommunitySync = function() {
    if (!window.playhtml || typeof window.playhtml.createPageData !== 'function') {
      renderMemberChips();
      loadAllCommunityGists();
      return;
    }

    try {
      console.log('🔄 Đang kích hoạt PlayHTML Community Channel...');
      communityPageData = window.playhtml.createPageData('community_registered_users_v2', communityUsers);

      // Đọc và hòa trộn dữ liệu 2 chiều (Local + Server)
      const remoteList = communityPageData.getData();
      if (Array.isArray(remoteList) && remoteList.length > 0) {
        communityUsers = [...new Set([...communityUsers, ...remoteList])];
      }

      // Đảm bảo user hiện tại có mặt trong danh sách
      if (currentUser && currentUser.login) {
        const me = currentUser.login.trim().toLowerCase();
        if (!communityUsers.includes(me)) communityUsers.push(me);
      }

      saveLocalCommunityUsers(communityUsers);
      communityPageData.setData(communityUsers);

      renderMemberChips();
      loadAllCommunityGists();

      // Lắng nghe realtime khi có bất kỳ ai ở bất kỳ cửa sổ/máy tính nào đăng nhập
      communityPageData.onUpdate((newList) => {
        console.log('⚡ [PlayHTML] Nhận danh sách thành viên mới qua WebSocket:', newList);
        if (Array.isArray(newList) && newList.length > 0) {
          const beforeCount = communityUsers.length;
          communityUsers = [...new Set([...communityUsers, ...newList])];
          saveLocalCommunityUsers(communityUsers);
          renderMemberChips();

          if (communityUsers.length > beforeCount) {
            showSuccess(`🎉 Thành viên mới (@${newList[newList.length - 1]}) vừa tham gia!`);
            loadAllCommunityGists();
          }
        }
      });
    } catch (err) {
      console.warn('[PlayHTML] Lỗi init community sync:', err);
      renderMemberChips();
      loadAllCommunityGists();
    }
  };

  // Render các nút lọc thành viên (Member Chips)
  function renderMemberChips() {
    if (!memberCountEl || !membersChipList) return;
    memberCountEl.textContent = communityUsers.length;

    const chipsHtml = [
      `<span class="member-chip ${selectedUserFilter === 'all' ? 'active' : ''}" data-user="all">Tất cả (${communityUsers.length})</span>`,
      ...communityUsers.map(u => `
        <span class="member-chip ${selectedUserFilter === u ? 'active' : ''}" data-user="${escapeHtml(u)}">
          @${escapeHtml(u)}
        </span>
      `)
    ].join('');

    membersChipList.innerHTML = chipsHtml;

    // Gắn sự kiện click để lọc bài
    membersChipList.querySelectorAll('.member-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        selectedUserFilter = chip.dataset.user;
        membersChipList.querySelectorAll('.member-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        renderCommunityGistsList();
      });
    });
  }

  // Tải danh sách Gist của TOÀN BỘ các thành viên đã lưu trong PlayHTML
  async function loadAllCommunityGists() {
    const token = getCookie(COOKIE_NAME);
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    communityFeedList.innerHTML = `
      <div class="loading-state">
        <span class="status-indicator checking"></span> 
        Đang tổng hợp Gist từ ${communityUsers.length} thành viên cộng đồng...
      </div>
    `;

    try {
      const promises = communityUsers.map(async (u) => {
        try {
          const res = await fetch(`https://api.github.com/users/${u}/gists?per_page=6`, { headers });
          if (!res.ok) return [];
          const data = await res.json();
          return (data || []).map(g => ({ ...g, author_login: u }));
        } catch (_) {
          return [];
        }
      });

      const results = await Promise.all(promises);
      allCommunityGists = results.flat().sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

      renderCommunityGistsList();
    } catch (err) {
      console.error(err);
      communityFeedList.innerHTML = `<li class="loading-item">Lỗi khi tải Gist của các thành viên. Bấm "Làm Mới" để thử lại.</li>`;
    }
  }

  // Render danh sách Gist ra giao diện
  function renderCommunityGistsList() {
    let filtered = allCommunityGists;
    if (selectedUserFilter !== 'all') {
      filtered = allCommunityGists.filter(g => (g.author_login || '').toLowerCase() === selectedUserFilter.toLowerCase());
    }

    if (filtered.length === 0) {
      communityFeedList.innerHTML = `
        <div class="card" style="text-align: center; padding: 2rem;">
          <p style="color: var(--text-secondary);">Chưa có Gist nào từ ${selectedUserFilter === 'all' ? 'các thành viên' : '@' + selectedUserFilter}.</p>
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

    // Kích hoạt lại PlayHTML Realtime cho các nút like vừa render
    if (window.playhtml && typeof window.playhtml.init === 'function') {
      try {
        window.playhtml.init();
      } catch (_) {}
    }
  }

  btnSubmitQuickShare.addEventListener('click', () => {
    const title = document.getElementById('quick-title').value.trim();
    const lang = document.getElementById('quick-lang').value;
    const code = document.getElementById('quick-code').value.trim();

    if (!title || !code) {
      showError('Vui lòng nhập đầy đủ tiêu đề và nội dung code!');
      return;
    }

    addCustomLocalSnippet({
      title,
      author: currentUser ? currentUser.login : 'Thành viên',
      desc: `Chia sẻ đoạn code ${lang} hữu ích cho cộng đồng.`,
      code,
      lang
    });

    document.getElementById('quick-title').value = '';
    document.getElementById('quick-code').value = '';
    toggleQuickShare(false);
    showSuccess('Đã đăng thành công lên danh sách cộng đồng!');
  });

  function addCustomLocalSnippet({ title, author, desc, code, lang }) {
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
              Đăng bởi <strong>@${escapeHtml(author)}</strong> • <span class="badge-lang ${langClass}">${escapeHtml(lang)}</span>
            </div>
          </div>
        </div>
        <span class="feed-time">Vừa đăng</span>
      </div>
      <p class="feed-item-desc">${escapeHtml(desc)}</p>
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

    communityFeedList.prepend(item);
    if (window.playhtml?.init) window.playhtml.init();
  }

  // 8. TÌM KIẾM GIST CỦA NGƯỜI KHÁC (KỂ CẢ KHI OFFLINE)
  searchUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const targetUser = targetUsernameInput.value.trim().replace(/^@/, '');
    if (!targetUser) return;

    btnSearchUser.disabled = true;
    searchLoading.classList.remove('hidden');
    searchResultsWrapper.classList.add('hidden');

    try {
      const token = getCookie(COOKIE_NAME);
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      // 1. Lấy Profile người đó
      const userRes = await fetch(`https://api.github.com/users/${targetUser}`, { headers });
      if (!userRes.ok) {
        throw new Error(`Không tìm thấy người dùng @${targetUser} trên GitHub.`);
      }
      const targetData = await userRes.json();

      // 2. Lấy danh sách Gist public của người đó
      const gistsRes = await fetch(`https://api.github.com/users/${targetUser}/gists?per_page=30`, { headers });
      const targetGists = gistsRes.ok ? await gistsRes.json() : [];

      renderTargetUserResults(targetData, targetGists);
      searchResultsWrapper.classList.remove('hidden');
    } catch (err) {
      showError(err.message || 'Lỗi khi tìm kiếm.');
    } finally {
      searchLoading.classList.add('hidden');
      btnSearchUser.disabled = false;
    }
  });

  function renderTargetUserResults(user, gists) {
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

  // Helpers
  function detectLanguage(filename = '') {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'py') return 'Python';
    if (ext === 'js' || ext === 'ts') return 'JavaScript';
    if (ext === 'cpp' || ext === 'c' || ext === 'h') return 'C++';
    if (ext === 'java') return 'Java';
    if (ext === 'html' || ext === 'css') return 'HTML/CSS';
    return 'Code';
  }

  function getLangClass(lang = '') {
    if (lang === 'Python') return 'lang-python';
    if (lang === 'JavaScript') return 'lang-js';
    if (lang === 'C++') return 'lang-cpp';
    return 'lang-other';
  }

  function getLangIcon(lang = '') {
    if (lang === 'Python') return '🐍';
    if (lang === 'JavaScript') return '⚡';
    if (lang === 'C++') return '🚀';
    if (lang === 'Java') return '☕';
    if (lang === 'HTML/CSS') return '🌐';
    return '📄';
  }

  function showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.classList.remove('hidden');
    setTimeout(() => errorBanner.classList.add('hidden'), 6000);
  }

  function showSuccess(msg) {
    successBanner.textContent = msg;
    successBanner.classList.remove('hidden');
    setTimeout(() => successBanner.classList.add('hidden'), 5000);
  }

  function hideBanners() {
    errorBanner.classList.add('hidden');
    successBanner.classList.add('hidden');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  window.showError = showError;
  window.showSuccess = showSuccess;
});

// =========================================================================
// CÁC HÀM XỬ LÝ MODAL XEM & FORK CODE
// =========================================================================
window.openCodePreview = function(title, code, gistId = '') {
  const modal = document.getElementById('code-modal');
  const titleEl = document.getElementById('modal-code-title');
  const codeEl = document.getElementById('modal-code-content').querySelector('code');
  const forkBtn = document.getElementById('btn-fork-code');

  currentModalCode = code || '';
  currentModalGistId = gistId || '';

  titleEl.textContent = title;
  codeEl.textContent = code;

  if (gistId) {
    forkBtn.style.display = 'inline-flex';
  } else {
    forkBtn.style.display = 'none';
  }

  modal.classList.remove('hidden');
};

window.closeCodeModal = function() {
  document.getElementById('code-modal').classList.add('hidden');
};

window.copyModalCode = function() {
  if (!currentModalCode) return;
  navigator.clipboard.writeText(currentModalCode);
  window.showSuccess('Đã sao chép mã nguồn vào bộ nhớ tạm!');
};

window.copySnippetCode = function(code) {
  if (!code) return;
  navigator.clipboard.writeText(code);
  window.showSuccess('Đã sao chép đoạn code vào bộ nhớ tạm!');
};

window.copySnippetLink = function(url) {
  if (!url) return;
  navigator.clipboard.writeText(url);
  window.showSuccess('Đã sao chép link Gist vào bộ nhớ tạm!');
};

window.fetchAndOpenGist = async function(gistId) {
  try {
    const token = getCookie(COOKIE_NAME);
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    const res = await fetch(`https://api.github.com/gists/${gistId}`, { headers });
    if (!res.ok) throw new Error('Không thể tải Gist.');

    const gist = await res.json();
    const firstFile = Object.values(gist.files || {})[0];
    const codeContent = firstFile ? firstFile.content : '// Trống';
    const title = gist.description || (firstFile ? firstFile.filename : 'Snippet');

    window.openCodePreview(title, codeContent, gist.id);
  } catch (err) {
    window.showError('Không thể mở nội dung bài tập.');
  }
};

window.forkGist = async function(gistId) {
  const token = getCookie(COOKIE_NAME);
  if (!token) {
    window.showError('Bạn cần đăng nhập để Fork code về tài khoản cá nhân!');
    return;
  }

  if (!confirm('Bạn có muốn sao chép (Fork) đoạn code này về tài khoản GitHub của bạn?')) return;

  try {
    const res = await fetch(`https://api.github.com/gists/${gistId}/forks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json'
      }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi khi Fork.');

    window.showSuccess(`🎉 Fork thành công! Mã đã được lưu vào tài khoản của bạn: ${data.html_url}`);
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (err) {
    window.showError(err.message || 'Fork thất bại.');
  }
};

window.forkCurrentModalCode = function() {
  if (currentModalGistId) {
    window.forkGist(currentModalGistId);
  }
};
