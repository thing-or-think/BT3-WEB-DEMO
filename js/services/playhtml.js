import { CONFIG } from '../config.js';
let playhtmlInstance = null;
let communityChannel = null;
let snippetsChannel = null;
export async function initPlayHTMLService(onReadyCallback) {
    try {
        console.log('🔄 Đang tải PlayHTML từ CDN:', CONFIG.PLAYHTML_CDN);
        const { playhtml } = await import(CONFIG.PLAYHTML_CDN);
        // QUAN TRỌNG: KHÔNG gán window.playhtml trước khi playhtml.init() chạy!
        console.log('🔄 Đang khởi tạo phòng PlayHTML:', CONFIG.PLAYHTML_ROOM);
        await playhtml.init({ room: CONFIG.PLAYHTML_ROOM });
        window.playhtml = playhtml;
        playhtmlInstance = playhtml;
        console.log(`✅ [PlayHTML Service] Đã kết nối thành công room: ${playhtml.roomId || CONFIG.PLAYHTML_ROOM}`);
        if (typeof onReadyCallback === 'function') {
            await onReadyCallback(playhtml);
        }
    }
    catch (err) {
        console.error('❌ [PlayHTML Service] Lỗi khởi tạo CDN hoặc kết nối room:', err);
        if (typeof onReadyCallback === 'function' && (window.playhtml || playhtmlInstance)) {
            await onReadyCallback((window.playhtml || playhtmlInstance));
        }
    }
}
export function createCommunityChannel(initialUsers = [], onUpdateCallback) {
    const p = window.playhtml || playhtmlInstance;
    if (!p || typeof p.createPageData !== 'function') {
        console.warn('⚠️ [PlayHTML] playhtml.createPageData chưa sẵn sàng!');
        return null;
    }
    try {
        console.log('🔄 Đang mở PageDataChannel: community_registered_users_v2');
        communityChannel = p.createPageData('community_registered_users_v2', initialUsers);
        if (typeof onUpdateCallback === 'function') {
            communityChannel.onUpdate((newList) => {
                console.log('⚡ [PlayHTML WebSocket] Nhận danh sách thành viên mới:', newList);
                onUpdateCallback(newList);
            });
        }
        return communityChannel;
    }
    catch (err) {
        console.error('❌ [PlayHTML] Lỗi tạo PageDataChannel:', err);
        return null;
    }
}
export function syncCommunityUsersList(usersList) {
    if (!communityChannel) {
        console.warn('⚠️ [PlayHTML] Không thể sync vì communityChannel chưa mở.');
        return;
    }
    try {
        const remote = communityChannel.getData();
        const remoteList = Array.isArray(remote) ? remote : [];
        const merged = [...new Set([...remoteList, ...usersList])];
        communityChannel.setData(merged);
        console.log('⚡ [PlayHTML Service] Đã đồng bộ thành viên lên Cloud:', merged);
    }
    catch (err) {
        console.warn('⚠️ [PlayHTML Service] Lỗi setData:', err);
    }
}
export function createSnippetsChannel(onUpdateCallback) {
    const p = window.playhtml || playhtmlInstance;
    if (!p || typeof p.createPageData !== 'function')
        return null;
    try {
        console.log('🔄 Đang mở PageDataChannel: community_shared_snippets_v2');
        snippetsChannel = p.createPageData('community_shared_snippets_v2', []);
        if (typeof onUpdateCallback === 'function') {
            snippetsChannel.onUpdate((newList) => {
                console.log('⚡ [PlayHTML WebSocket] Nhận danh sách Snippets mới:', newList);
                onUpdateCallback(newList);
            });
        }
        return snippetsChannel;
    }
    catch (err) {
        console.warn('⚠️ [PlayHTML] Không thể tạo snippetsChannel:', err);
        return null;
    }
}
export function getSharedSnippets() {
    if (!snippetsChannel)
        return [];
    try {
        const data = snippetsChannel.getData();
        return Array.isArray(data) ? data : [];
    }
    catch (_) {
        return [];
    }
}
export function broadcastSnippet(snippet) {
    if (!snippetsChannel || !snippet)
        return;
    try {
        const current = getSharedSnippets();
        const exists = current.some(s => s && s.id === snippet.id);
        if (!exists) {
            const updated = [snippet, ...current].slice(0, 50);
            snippetsChannel.setData(updated);
            console.log('⚡ [PlayHTML] Đã broadcast snippet mới lên Cloud:', snippet.description || snippet.id);
        }
    }
    catch (e) {
        console.warn('⚠️ [PlayHTML] Lỗi broadcastSnippet:', e);
    }
}
export function broadcastMultipleSnippets(snippetsList) {
    if (!snippetsChannel || !Array.isArray(snippetsList) || snippetsList.length === 0)
        return;
    try {
        const current = getSharedSnippets();
        const map = new Map();
        current.forEach(s => { if (s && s.id)
            map.set(s.id, s); });
        snippetsList.forEach(s => { if (s && s.id)
            map.set(s.id, s); });
        const merged = Array.from(map.values())
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            .slice(0, 50);
        snippetsChannel.setData(merged);
        console.log('⚡ [PlayHTML] Đã đồng bộ', merged.length, 'snippets lên Cloud');
    }
    catch (e) {
        console.warn('⚠️ [PlayHTML] Lỗi broadcastMultipleSnippets:', e);
    }
}
export function reinitPlayHTMLElements() {
    const p = window.playhtml || playhtmlInstance;
    if (!p)
        return;
    try {
        if (typeof p.setupPlayElements === 'function') {
            p.setupPlayElements();
        }
    }
    catch (err) {
        console.warn('⚠️ [PlayHTML] Lỗi setupPlayElements:', err);
    }
}
//# sourceMappingURL=playhtml.js.map