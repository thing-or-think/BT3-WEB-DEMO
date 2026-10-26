import { CONFIG } from '../config.js';

let playhtmlInstance = null;
let communityChannel = null;

export async function initPlayHTMLService(onReadyCallback) {
  try {
    const { playhtml } = await import(CONFIG.PLAYHTML_CDN);
    window.playhtml = playhtml;
    playhtmlInstance = playhtml;

    // Khởi tạo phòng cố định để đồng bộ mọi clients
    playhtml.init({ room: CONFIG.PLAYHTML_ROOM });
    console.log(`✅ [PlayHTML Service] Đã kết nối room: ${CONFIG.PLAYHTML_ROOM}`);

    if (typeof onReadyCallback === 'function') {
      onReadyCallback(playhtml);
    }
  } catch (err) {
    console.warn('⚠️ [PlayHTML Service] Lỗi khởi tạo CDN:', err);
  }
}

export function createCommunityChannel(initialUsers = [], onUpdateCallback) {
  if (!window.playhtml || typeof window.playhtml.createPageData !== 'function') {
    return null;
  }

  try {
    communityChannel = window.playhtml.createPageData('community_registered_users_v2', initialUsers);

    // Lắng nghe realtime từ mạng PartyKit
    if (typeof onUpdateCallback === 'function') {
      communityChannel.onUpdate((newList) => {
        onUpdateCallback(newList);
      });
    }

    return communityChannel;
  } catch (err) {
    console.warn('⚠️ [PlayHTML] Không thể tạo PageDataChannel:', err);
    return null;
  }
}

export function syncCommunityUsersList(usersList) {
  if (!communityChannel) return;
  try {
    const remote = communityChannel.getData();
    const remoteList = Array.isArray(remote) ? remote : [];
    const merged = [...new Set([...remoteList, ...usersList])];
    communityChannel.setData(merged);
    console.log('⚡ [PlayHTML Service] Đã gửi danh sách lên cloud:', merged);
  } catch (err) {
    console.warn('⚠️ [PlayHTML Service] Lỗi setData:', err);
  }
}

export function reinitPlayHTMLElements() {
  if (window.playhtml && typeof window.playhtml.init === 'function') {
    try {
      window.playhtml.init();
    } catch (_) {}
  }
}
