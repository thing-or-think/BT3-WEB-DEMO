// Helper quản lý Cookie (Thời hạn 30 ngày)
const COOKIE_NAME = 'gh_token';
const COOKIE_DAYS = 30;

function setCookie(name, value, days) {
  const maxAge = days * 24 * 60 * 60;
  // Lưu cookie trình duyệt
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
  // Đồng bộ thêm vào localStorage để đảm bảo tương thích mọi môi trường (kể cả sub-path GitHub Pages)
  try {
    localStorage.setItem(name, value);
  } catch (_) {}
}

function getCookie(name) {
  // 1. Thử đọc từ document.cookie
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim();
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length));
    }
  }
  // 2. Fallback sang localStorage nếu cookie bị chặn bởi chính sách browser
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

// Quản lý giao diện và xử lý logic
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const headerStatus = document.getElementById('header-user-status');
  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');
  const errorBanner = document.getElementById('error-banner');
  const successBanner = document.getElementById('success-banner');

  // Form & buttons
  const patForm = document.getElementById('pat-form');
  const patInput = document.getElementById('pat-input');
  const btnSavePat = document.getElementById('btn-save-pat');
  const btnLogout = document.getElementById('btn-logout');
  const btnReload = document.getElementById('btn-reload');
  const saveSnippetForm = document.getElementById('save-snippet-form');
  const btnSaveCode = document.getElementById('btn-save-code');
  const btnOAuthLogin = document.getElementById('btn-oauth-login');
  const saveResult = document.getElementById('save-result');
  const gistsList = document.getElementById('gists-list');

  // Xử lý nút OAuth Login
  if (btnOAuthLogin) {
    btnOAuthLogin.addEventListener('click', () => {
      // Kiểm tra nếu đang chạy trên GitHub Pages tĩnh (domain github.io)
      if (window.location.hostname.endsWith('github.io')) {
        showError('💡 GitHub Pages là web tĩnh (không có backend Node.js để đổi mã OAuth). Vui lòng dùng [Cách 2: Nhập Token PAT] bên phải để đăng nhập & lưu Cookie 30 ngày ngay lập tức!');
        patInput.focus();
        patInput.style.borderColor = '#58a6ff';
        patInput.style.boxShadow = '0 0 10px rgba(56, 139, 253, 0.5)';
        setTimeout(() => {
          patInput.style.boxShadow = '';
        }, 2500);
        return;
      }
      // Nếu đang chạy trên server Node.js localhost
      window.location.href = '/api/auth/github';
    });
  }

  // User Profile elements
  const userAvatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');
  const userLogin = document.getElementById('user-login');
  const userBio = document.getElementById('user-bio');
  const statRepos = document.getElementById('stat-repos');
  const statGists = document.getElementById('stat-gists');
  const statFollowers = document.getElementById('stat-followers');
  const userLink = document.getElementById('user-link');

  // 1. Kiểm tra tham số lỗi trên URL (nếu có từ OAuth callback)
  const urlParams = new URLSearchParams(window.location.search);
  const errorParam = urlParams.get('error');
  if (errorParam) {
    showError(`Lỗi xác thực: ${decodeURIComponent(errorParam)}`);
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // 2. BƯỚC QUAN TRỌNG: Kiểm tra Cookie hiện có để tự động đăng nhập
  checkAuthSession();

  async function checkAuthSession() {
    headerStatus.innerHTML = `<span class="status-indicator checking"></span> Đang kiểm tra Cookie phiên...`;

    // Lấy token từ Cookie trình duyệt
    const token = getCookie(COOKIE_NAME);

    if (!token) {
      // Thử gọi /api/me (nếu đang chạy trên server Node.js)
      try {
        const res = await fetch('/api/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            return renderAuthenticatedUI(data.user, data.gists);
          }
        }
      } catch (_) {}

      renderUnauthenticatedUI();
      return;
    }

    // Xác thực token trực tiếp với GitHub API (chạy 100% Client-side trên GitHub Pages)
    try {
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json'
        }
      });

      if (!userRes.ok) {
        // Token trong cookie không còn hợp lệ -> Xóa cookie
        deleteCookie(COOKIE_NAME);
        renderUnauthenticatedUI();
        showError('Phiên làm việc trong Cookie đã hết hạn hoặc bị thu hồi trên GitHub.');
        return;
      }

      const userData = await userRes.json();

      // Lấy danh sách Gists mới nhất của user
      let gists = [];
      try {
        const gistsRes = await fetch('https://api.github.com/gists?per_page=5', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json'
          }
        });
        if (gistsRes.ok) {
          gists = await gistsRes.json();
        }
      } catch (_) {}

      renderAuthenticatedUI(userData, gists);
    } catch (err) {
      console.error('Lỗi kết nối GitHub:', err);
      showError('Không thể kết nối đến GitHub API. Vui lòng kiểm tra mạng.');
      renderUnauthenticatedUI();
    }
  }

  // 3. Hiển thị trạng thái đã đăng nhập
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

  // 4. Hiển thị trạng thái chưa đăng nhập
  function renderUnauthenticatedUI() {
    headerStatus.innerHTML = `<span class="status-indicator offline"></span> Chưa đăng nhập`;
    loginView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
  }

  // 5. Render danh sách Gists
  function renderGists(gists) {
    if (!gists || gists.length === 0) {
      gistsList.innerHTML = `<li class="loading-item">Chưa có Gist nào. Hãy thử lưu đoạn code đầu tiên ở trên!</li>`;
      return;
    }

    gistsList.innerHTML = gists.map(g => {
      const fileNames = Object.keys(g.files || {}).join(', ') || 'snippet';
      const desc = g.description || fileNames;
      return `
        <li class="gist-item">
          <div>
            <a href="${g.html_url}" target="_blank" rel="noopener">${escapeHtml(desc)}</a>
            <div class="gist-files">📄 ${escapeHtml(fileNames)}</div>
          </div>
          <a href="${g.html_url}" target="_blank" class="btn btn-outline" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">Mở ↗</a>
        </li>
      `;
    }).join('');
  }

  // 6. Xử lý Đăng nhập nhanh bằng Personal Access Token (PAT)
  patForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = patInput.value.trim();
    if (!token) return;

    btnSavePat.disabled = true;
    btnSavePat.textContent = 'Đang xác thực & Ghi Cookie...';
    hideBanners();

    try {
      // Kiểm tra token với GitHub API
      const res = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json'
        }
      });

      if (!res.ok) {
        showError('Token không hợp lệ hoặc không có quyền truy cập GitHub!');
        return;
      }

      const user = await res.json();

      // LƯU VÀO COOKIE VỚI HẠN DÙNG 30 NGÀY
      setCookie(COOKIE_NAME, token, COOKIE_DAYS);

      showSuccess(`🎉 Xin chào @${user.login}! Đã lưu Cookie phiên làm việc trong 30 ngày.`);
      patInput.value = '';

      // Tải lại phiên để hiển thị Dashboard
      await checkAuthSession();
    } catch (err) {
      console.error(err);
      showError('Lỗi kết nối khi gửi token.');
    } finally {
      btnSavePat.disabled = false;
      btnSavePat.textContent = 'Xác nhận & Lưu Cookie';
    }
  });

  // 7. Thử nghiệm "Test F5 / Tải Lại Trang"
  btnReload.addEventListener('click', () => {
    location.reload();
  });

  // 8. Đăng xuất: Xóa Cookie
  btnLogout.addEventListener('click', () => {
    if (!confirm('Bạn có chắc chắn muốn xóa Cookie và đăng xuất?')) return;

    deleteCookie(COOKIE_NAME);
    // Xóa thêm phía server nếu có
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});

    showSuccess('Đã xóa Cookie thành công. Bạn đã đăng xuất.');
    renderUnauthenticatedUI();
  });

  // 9. Thử nghiệm Git as a DB: Lưu Code trực tiếp lên GitHub Gist của User
  saveSnippetForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const token = getCookie(COOKIE_NAME);
    if (!token) {
      showError('Không tìm thấy token trong Cookie. Vui lòng đăng nhập lại!');
      return;
    }

    const title = document.getElementById('snippet-title').value.trim();
    const filename = document.getElementById('snippet-filename').value.trim();
    const code = document.getElementById('snippet-code').value;

    btnSaveCode.disabled = true;
    btnSaveCode.textContent = '⏳ Đang gọi GitHub API để tạo Gist...';
    saveResult.classList.add('hidden');

    try {
      // Gọi trực tiếp GitHub Gist API (hỗ trợ CORS 100% trên GitHub Pages)
      const res = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github+json'
        },
        body: JSON.stringify({
          description: title || 'Snippet được lưu từ Web Demo',
          public: false, // Lưu riêng tư (Private Gist)
          files: {
            [filename]: { content: code }
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showError(data.message || 'Lỗi khi lưu Gist!');
        return;
      }

      saveResult.innerHTML = `
        <div style="color: #3fb950; font-weight: 600; margin-bottom: 0.4rem;">
          ✅ Code đã được lưu trực tiếp vào GitHub của bạn!
        </div>
        <div>
          Xem trực tiếp trên GitHub: 
          <a href="${data.html_url}" target="_blank" rel="noopener">${data.html_url} ↗</a>
        </div>
      `;
      saveResult.classList.remove('hidden');

      // Tải lại danh sách Gist
      setTimeout(() => {
        checkAuthSession();
      }, 1000);

    } catch (err) {
      console.error(err);
      showError('Lỗi kết nối khi lưu Gist.');
    } finally {
      btnSaveCode.disabled = false;
      btnSaveCode.textContent = '💾 Bấm để Lưu Code vào GitHub Gist';
    }
  });

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
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
