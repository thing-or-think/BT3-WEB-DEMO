import { CONFIG } from '../config.js';
import { getCookie } from '../utils/cookie.js';
function getHeaders(customToken = null) {
    const token = customToken || getCookie(CONFIG.COOKIE_NAME);
    const headers = {
        'Accept': 'application/vnd.github+json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}
export async function fetchUserProfile(token = null) {
    const headers = getHeaders(token);
    const res = await fetch(`${CONFIG.API_BASE_URL}/user`, { headers });
    if (!res.ok)
        throw new Error('Token không hợp lệ hoặc đã hết hạn trên GitHub.');
    return await res.json();
}
export async function fetchTargetUserProfile(username) {
    try {
        const headers = getHeaders();
        let res = await fetch(`${CONFIG.API_BASE_URL}/users/${username}`, { headers });
        if (res.status === 401 || res.status === 403) {
            res = await fetch(`${CONFIG.API_BASE_URL}/users/${username}`);
        }
        if (!res.ok)
            throw new Error(`Không tìm thấy người dùng @${username} trên GitHub.`);
        return await res.json();
    }
    catch (err) {
        throw err;
    }
}
export async function fetchUserGists(username, perPage = 6) {
    try {
        const headers = getHeaders();
        let res = await fetch(`${CONFIG.API_BASE_URL}/users/${username}/gists?per_page=${perPage}`, { headers });
        if (res.status === 401 || res.status === 403) {
            res = await fetch(`${CONFIG.API_BASE_URL}/users/${username}/gists?per_page=${perPage}`);
        }
        if (!res.ok)
            return [];
        const gists = await res.json();
        return (gists || []).map(g => ({ ...g, author_login: username }));
    }
    catch (_) {
        return [];
    }
}
export async function fetchMyGists(token = null, perPage = 6) {
    const headers = getHeaders(token);
    const res = await fetch(`${CONFIG.API_BASE_URL}/gists?per_page=${perPage}`, { headers });
    if (!res.ok)
        return [];
    return await res.json();
}
export async function fetchGistDetail(gistId) {
    try {
        const headers = getHeaders();
        let res = await fetch(`${CONFIG.API_BASE_URL}/gists/${gistId}`, { headers });
        if (res.status === 401 || res.status === 403) {
            res = await fetch(`${CONFIG.API_BASE_URL}/gists/${gistId}`);
        }
        if (!res.ok)
            throw new Error('Không thể tải nội dung Gist.');
        return await res.json();
    }
    catch (err) {
        throw err;
    }
}
export async function createGist({ title, filename, code, isPublic = true }, token = null) {
    const headers = {
        ...getHeaders(token),
        'Content-Type': 'application/json'
    };
    const res = await fetch(`${CONFIG.API_BASE_URL}/gists`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            description: title || 'Snippet lưu từ Web Demo',
            public: isPublic,
            files: { [filename]: { content: code } }
        })
    });
    const data = await res.json();
    if (!res.ok)
        throw new Error(data.message || 'Lỗi khi tạo Gist trên GitHub!');
    return data;
}
export async function forkGist(gistId, token = null) {
    const headers = getHeaders(token);
    const res = await fetch(`${CONFIG.API_BASE_URL}/gists/${gistId}/forks`, {
        method: 'POST',
        headers
    });
    const data = await res.json();
    if (!res.ok)
        throw new Error(data.message || 'Lỗi khi Fork Gist.');
    return data;
}
//# sourceMappingURL=github.js.map