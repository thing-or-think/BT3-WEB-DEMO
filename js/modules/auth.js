import { state } from './state.js';
import { getCookie, setCookie, deleteCookie } from '../utils/cookie.js';
import { fetchUserProfile, fetchMyGists } from '../services/github.js';
import { showError, showSuccess, hideBanners } from '../utils/dom.js';
import { renderUserGists } from './editor.js';
import { registerUserToCommunity } from './feed.js';
import { broadcastMultipleSnippets } from '../services/playhtml.js';
export async function checkAuthSession() {
    const headerStatus = document.getElementById('header-user-status');
    if (headerStatus) {
        headerStatus.innerHTML = `<span class="status-indicator checking"></span> Đang kiểm tra Cookie phiên...`;
    }
    const token = getCookie();
    if (!token) {
        // Fallback thử kiểm tra server local (nếu đang chạy localhost)
        try {
            const res = await fetch('/api/me');
            if (res.ok) {
                const data = await res.json();
                if (data.authenticated && data.user) {
                    state.currentUser = data.user;
                    renderAuthenticatedUI(data.user, data.gists);
                    registerUserToCommunity(data.user.login);
                    return;
                }
            }
        }
        catch (_) { }
        renderUnauthenticatedUI();
        return;
    }
    try {
        const user = await fetchUserProfile(token);
        state.currentUser = user;
        // Tự động ghi danh vào PlayHTML
        registerUserToCommunity(user.login);
        let gists = [];
        try {
            gists = await fetchMyGists(token, 6);
            if (Array.isArray(gists) && gists.length > 0) {
                const formatted = gists.map(g => ({
                    ...g,
                    author_login: user.login
                }));
                broadcastMultipleSnippets(formatted);
            }
        }
        catch (_) { }
        renderAuthenticatedUI(user, gists);
    }
    catch (_) {
        deleteCookie();
        renderUnauthenticatedUI();
        showError('Phiên đăng nhập trong Cookie đã hết hạn trên GitHub.');
    }
}
export function renderAuthenticatedUI(user, gists = []) {
    const headerStatus = document.getElementById('header-user-status');
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    if (headerStatus) {
        headerStatus.innerHTML = `<span class="status-indicator online"></span> Đã kết nối: <strong>@${user.login}</strong> (Cookie 30 ngày)`;
    }
    loginView?.classList.add('hidden');
    dashboardView?.classList.remove('hidden');
    // Cập nhật thông tin profile sidebar
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const userLogin = document.getElementById('user-login');
    const userBio = document.getElementById('user-bio');
    const statRepos = document.getElementById('stat-repos');
    const statGists = document.getElementById('stat-gists');
    const statFollowers = document.getElementById('stat-followers');
    const userLink = document.getElementById('user-link');
    if (userAvatar)
        userAvatar.src = user.avatar_url;
    if (userName)
        userName.textContent = user.name || user.login;
    if (userLogin)
        userLogin.textContent = `@${user.login}`;
    if (userBio)
        userBio.textContent = user.bio || 'Chưa có tiểu sử trên GitHub.';
    if (statRepos)
        statRepos.textContent = String(user.public_repos ?? 0);
    if (statGists)
        statGists.textContent = String(user.public_gists ?? 0);
    if (statFollowers)
        statFollowers.textContent = String(user.followers ?? 0);
    if (userLink)
        userLink.href = user.html_url;
    renderUserGists(gists);
}
export function renderUnauthenticatedUI() {
    const headerStatus = document.getElementById('header-user-status');
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    if (headerStatus) {
        headerStatus.innerHTML = `<span class="status-indicator offline"></span> Khách (Chưa đăng nhập)`;
    }
    loginView?.classList.remove('hidden');
    dashboardView?.classList.add('hidden');
}
export function initAuthModule() {
    const patForm = document.getElementById('pat-form');
    const patInput = document.getElementById('pat-input');
    const btnSavePat = document.getElementById('btn-save-pat');
    const btnLogout = document.getElementById('btn-logout');
    const btnReload = document.getElementById('btn-reload');
    const btnOAuthLogin = document.getElementById('btn-oauth-login');
    // Đăng nhập bằng Token (PAT)
    patForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = patInput?.value.trim();
        if (!token)
            return;
        if (btnSavePat) {
            btnSavePat.disabled = true;
            btnSavePat.textContent = 'Đang xác thực & Lưu Cookie...';
        }
        hideBanners();
        try {
            const user = await fetchUserProfile(token);
            state.currentUser = user;
            setCookie(undefined, token);
            registerUserToCommunity(user.login);
            showSuccess(`🎉 Xin chào @${user.login}! Cookie phiên đã được lưu 30 ngày.`);
            if (patInput)
                patInput.value = '';
            await checkAuthSession();
        }
        catch (err) {
            const error = err;
            showError(error.message || 'Lỗi kết nối khi gửi token.');
        }
        finally {
            if (btnSavePat) {
                btnSavePat.disabled = false;
                btnSavePat.textContent = 'Xác nhận & Lưu Cookie 30 Ngày';
            }
        }
    });
    // Nút OAuth 1-click
    btnOAuthLogin?.addEventListener('click', () => {
        if (window.location.hostname.endsWith('github.io')) {
            showError('💡 GitHub Pages là web tĩnh. Vui lòng dùng [Cách 2: Nhập Token PAT] bên phải để lưu Cookie 30 ngày!');
            patInput?.focus();
            return;
        }
        window.location.href = '/api/auth/github';
    });
    btnReload?.addEventListener('click', () => location.reload());
    btnLogout?.addEventListener('click', () => {
        if (!confirm('Xóa Cookie và đăng xuất?'))
            return;
        deleteCookie();
        fetch('/api/auth/logout', { method: 'POST' }).catch(() => { });
        showSuccess('Đã xóa Cookie thành công.');
        state.currentUser = null;
        renderUnauthenticatedUI();
    });
}
//# sourceMappingURL=auth.js.map