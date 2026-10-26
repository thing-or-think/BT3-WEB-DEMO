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

  // PlayHTML Board Elements
  const playCanvas = document.getElementById('play-canvas');
  const btnAddQuickNote = document.getElementById('btn-add-quick-note');

  // Tab 3: Search User Elements
  const searchUserForm = document.getElementById('search-user-form');
  const targetUsernameInput = document.getElementById('target-username-input');
  const btnSearchUser = document.getElementById('btn-search-user');
  const searchLoading = document.getElementById('search-loading');
  const searchResultsWrapper = document.getElementById('search-results-wrapper');
  const targetUserHeader = document.getElementById('target-user-header');
  const targetGistsList = document.getElementById('target-gists-list');

  // Current logged in user object
  let currentUser = null;

  // 1. Kiểm tra tham số Deep-Link (Ví dụ: ?gist=ID)
  const urlParams = new URLSearchParams(window.location.search);
  const gistQuery = urlParams.get('gist');
  if (gistQuery) {
    fetchAndOpenGist(gistQuery);
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
            <button class="btn btn-secondary btn-xs" onclick="pinExistingGistToBoard('${escapeHtml(desc)}', '${g.id}', '${escapeHtml(fileNames)}')">📌 Ghim PlayHTML</button>
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
        public: true, // Để chế độ public để bạn bè xem được
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

  // Nút: "Lưu & Ghim lên Bảng PlayHTML"
  btnSaveAndPin.addEventListener('click', async () => {
    btnSaveAndPin.disabled = true;
    btnSaveAndPin.textContent = '⏳ Đang lưu & tạo thẻ PlayHTML...';

    try {
      const result = await performSaveGist();
      if (!result) return;

      // Tạo thẻ mới trên PlayHTML Canvas
      addPlayCardToCanvas({
        title: result.title,
        author: currentUser ? currentUser.login : 'user',
        preview: result.code.slice(0, 100),
        fullCode: result.code,
        gistId: result.data.id
      });

      showSuccess('🎉 Đã lưu vào GitHub và ghim thành công lên Bảng PlayHTML Realtime!');
      // Tự động chuyển sang Tab PlayHTML để xem
      document.querySelector('[data-tab="tab-playhtml"]').click();
      setTimeout(checkAuthSession, 1200);
    } catch (err) {
      showError(err.message || 'Lỗi khi lưu & ghim bài.');
    } finally {
      btnSaveAndPin.disabled = false;
      btnSaveAndPin.textContent = '📌 Lưu & Ghim lên Bảng PlayHTML';
    }
  });

  // 7. PLAYHTML REALTIME CANVAS LOGIC
  function addPlayCardToCanvas({ title, author, preview, fullCode, gistId }) {
    const card = document.createElement('div');
    card.className = 'play-card';
    card.setAttribute('can-move', ''); // PlayHTML Draggable

    // Tọa độ ngẫu nhiên gần giữa bảng
    const randX = Math.floor(Math.random() * 200) + 50;
    const randY = Math.floor(Math.random() * 150) + 50;
    card.style.transform = `translate(${randX}px, ${randY}px)`;

    card.innerHTML = `
      <div class="card-pill">Snippet Mới</div>
      <h4>${escapeHtml(title)}</h4>
      <p class="card-author">Tác giả: @${escapeHtml(author)}</p>
      <pre class="snippet-preview">${escapeHtml(preview)}</pre>
      <div class="play-card-footer">
        <button can-toggle class="play-reaction-btn">❤️ <span>Thích</span></button>
        <button class="btn btn-outline btn-xs" onclick="openCodePreview('${escapeHtml(title)}', ${JSON.stringify(fullCode)}, '${gistId || ''}')">Xem Code</button>
      </div>
    `;

    playCanvas.appendChild(card);

    // Kích hoạt lại PlayHTML để gắn sync vào thẻ mới
    if (window.playhtml && typeof window.playhtml.init === 'function') {
      try {
        window.playhtml.init();
      } catch (_) {}
    }
  }

  // Nút Thêm Thẻ Ghi Chú Nhanh trên PlayHTML
  btnAddQuickNote.addEventListener('click', () => {
    const note = document.createElement('div');
    note.className = 'play-card sticky-card';
    note.setAttribute('can-move', '');
    note.setAttribute('can-duplicate', '');

    const randX = Math.floor(Math.random() * 250) + 40;
    const randY = Math.floor(Math.random() * 180) + 60;
    note.style.transform = `translate(${randX}px, ${randY}px)`;

    const authorName = currentUser ? currentUser.login : 'Thành viên';
    note.innerHTML = `
      <div class="sticky-title">📌 Ghi Chú (@${escapeHtml(authorName)})</div>
      <p>Kéo thẻ này đi mọi nơi hoặc bấm duplicate để nhân bản!</p>
      <div class="play-card-footer">
        <span class="card-badge">can-move</span>
        <button can-toggle class="play-reaction-btn">👍 <span>Đồng ý</span></button>
      </div>
    `;

    playCanvas.appendChild(note);
    if (window.playhtml?.init) window.playhtml.init();
    showSuccess('Đã thêm thẻ mới vào bảng Realtime!');
  });

  // Cho phép ghim một Gist có sẵn từ danh sách cá nhân lên PlayHTML
  window.pinExistingGistToBoard = async function(title, gistId, filename) {
    try {
      const res = await fetch(`https://api.github.com/gists/${gistId}`);
      const data = await res.json();
      const firstFile = Object.values(data.files || {})[0];
      const codeContent = firstFile ? firstFile.content : '// No content';

      addPlayCardToCanvas({
        title,
        author: currentUser ? currentUser.login : 'user',
        preview: codeContent.slice(0, 100),
        fullCode: codeContent,
        gistId
      });

      showSuccess(`Đã ghim "${title}" lên Bảng PlayHTML!`);
      document.querySelector('[data-tab="tab-playhtml"]').click();
    } catch (err) {
      showError('Không thể tải nội dung Gist để ghim.');
    }
  };

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
