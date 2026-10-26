import { CONFIG } from '../config.js';

let playhtmlInstance = null;
let communityChannel = null;

export async function initPlayHTMLService(onReadyCallback) {
  try {
    console.log('🔄 Đang tải PlayHTML từ CDN:', CONFIG.PLAYHTML_CDN);
    const { playhtml } = await import(CONFIG.PLAYHTML_CDN);

    // QUAN TRỌNG: KHÔNG gán window.playhtml trước khi playhtml.init() chạy!
    // playhtml kiểm tra window.playhtml và sẽ báo lỗi "incompatible instance" nếu đã gán trước.
    console.log('🔄 Đang khởi tạo phòng PlayHTML:', CONFIG.PLAYHTML_ROOM);
    await playhtml.init({ room: CONFIG.PLAYHTML_ROOM });

    window.playhtml = playhtml;
    playhtmlInstance = playhtml;
    console.log(`✅ [PlayHTML Service] Đã kết nối thành công room: ${playhtml.roomId || CONFIG.PLAYHTML_ROOM}`);

    if (typeof onReadyCallback === 'function') {
      await onReadyCallback(playhtml);
    }
  } catch (err) {
    console.error('❌ [PlayHTML Service] Lỗi khởi tạo CDN hoặc kết nối room:', err);
    if (typeof onReadyCallback === 'function') {
      onReadyCallback(window.playhtml || playhtmlInstance);
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

    // Lắng nghe cập nhật realtime từ các clients khác
    if (typeof onUpdateCallback === 'function') {
      communityChannel.onUpdate((newList) => {
        console.log('⚡ [PlayHTML WebSocket] Nhận danh sách mới:', newList);
        onUpdateCallback(newList);
      });
    }

    return communityChannel;
  } catch (err) {
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
    console.log('⚡ [PlayHTML Service] Đã đồng bộ lên Cloud:', merged);
  } catch (err) {
    console.warn('⚠️ [PlayHTML Service] Lỗi setData:', err);
  }
}

export function reinitPlayHTMLElements() {
  const p = window.playhtml || playhtmlInstance;
  if (!p) return;

  try {
    // Dùng setupPlayElements để scan lại các phần tử can-toggle mới trong DOM mà không re-init room
    if (typeof p.setupPlayElements === 'function') {
      p.setupPlayElements();
    }
  } catch (err) {
    console.warn('⚠️ [PlayHTML] Lỗi setupPlayElements:', err);
  }
}
