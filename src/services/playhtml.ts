import { CONFIG } from '../config.js';
import { PlayHTMLInstance, PlayHTMLChannel, GitHubGist } from '../types/index.js';
import { BotProfile } from '../types/ottv2.js';

let playhtmlInstance: PlayHTMLInstance | null = null;
let communityChannel: PlayHTMLChannel<string[]> | null = null;
let snippetsChannel: PlayHTMLChannel<GitHubGist[]> | null = null;
let ottv2LadderChannel: PlayHTMLChannel<BotProfile[]> | null = null;

export async function initPlayHTMLService(
  onReadyCallback?: (instance: PlayHTMLInstance) => void | Promise<void>
): Promise<void> {
  try {
    console.log('🔄 Đang tải PlayHTML từ CDN:', CONFIG.PLAYHTML_CDN);
    const { playhtml }: { playhtml: PlayHTMLInstance } = await import(CONFIG.PLAYHTML_CDN);

    // QUAN TRỌNG: KHÔNG gán window.playhtml trước khi playhtml.init() chạy!
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
    if (typeof onReadyCallback === 'function' && (window.playhtml || playhtmlInstance)) {
      await onReadyCallback((window.playhtml || playhtmlInstance)!);
    }
  }
}

export function createCommunityChannel(
  initialUsers: string[] = [],
  onUpdateCallback?: (newList: string[]) => void
): PlayHTMLChannel<string[]> | null {
  const p = window.playhtml || playhtmlInstance;
  if (!p || typeof p.createPageData !== 'function') {
    console.warn('⚠️ [PlayHTML] playhtml.createPageData chưa sẵn sàng!');
    return null;
  }

  try {
    console.log('🔄 Đang mở PageDataChannel: community_registered_users_v2');
    communityChannel = p.createPageData<string[]>('community_registered_users_v2', initialUsers);

    if (typeof onUpdateCallback === 'function') {
      communityChannel.onUpdate((newList) => {
        console.log('⚡ [PlayHTML WebSocket] Nhận danh sách thành viên mới:', newList);
        onUpdateCallback(newList);
      });
    }

    return communityChannel;
  } catch (err) {
    console.error('❌ [PlayHTML] Lỗi tạo PageDataChannel:', err);
    return null;
  }
}

export function syncCommunityUsersList(usersList: string[]): void {
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
  } catch (err) {
    console.warn('⚠️ [PlayHTML Service] Lỗi setData:', err);
  }
}

export function createSnippetsChannel(
  onUpdateCallback?: (newSnippets: GitHubGist[]) => void
): PlayHTMLChannel<GitHubGist[]> | null {
  const p = window.playhtml || playhtmlInstance;
  if (!p || typeof p.createPageData !== 'function') return null;

  try {
    console.log('🔄 Đang mở PageDataChannel: community_shared_snippets_v2');
    snippetsChannel = p.createPageData<GitHubGist[]>('community_shared_snippets_v2', []);

    if (typeof onUpdateCallback === 'function') {
      snippetsChannel.onUpdate((newList) => {
        console.log('⚡ [PlayHTML WebSocket] Nhận danh sách Snippets mới:', newList);
        onUpdateCallback(newList);
      });
    }

    return snippetsChannel;
  } catch (err) {
    console.warn('⚠️ [PlayHTML] Không thể tạo snippetsChannel:', err);
    return null;
  }
}

export function getSharedSnippets(): GitHubGist[] {
  if (!snippetsChannel) return [];
  try {
    const data = snippetsChannel.getData();
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

export function broadcastSnippet(snippet: GitHubGist): void {
  if (!snippetsChannel || !snippet) return;
  try {
    const current = getSharedSnippets();
    const exists = current.some(s => s && s.id === snippet.id);
    if (!exists) {
      const updated = [snippet, ...current].slice(0, 50);
      snippetsChannel.setData(updated);
      console.log('⚡ [PlayHTML] Đã broadcast snippet mới lên Cloud:', snippet.description || snippet.id);
    }
  } catch (e) {
    console.warn('⚠️ [PlayHTML] Lỗi broadcastSnippet:', e);
  }
}

export function broadcastMultipleSnippets(snippetsList: GitHubGist[]): void {
  if (!snippetsChannel || !Array.isArray(snippetsList) || snippetsList.length === 0) return;
  try {
    const current = getSharedSnippets();
    const map = new Map<string, GitHubGist>();
    current.forEach(s => { if (s && s.id) map.set(s.id, s); });
    snippetsList.forEach(s => { if (s && s.id) map.set(s.id, s); });
    const merged = Array.from(map.values())
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 50);
    snippetsChannel.setData(merged);
    console.log('⚡ [PlayHTML] Đã đồng bộ', merged.length, 'snippets lên Cloud');
  } catch (e) {
    console.warn('⚠️ [PlayHTML] Lỗi broadcastMultipleSnippets:', e);
  }
}

export function reinitPlayHTMLElements(): void {
  const p = window.playhtml || playhtmlInstance;
  if (!p) return;

  try {
    if (typeof p.setupPlayElements === 'function') {
      p.setupPlayElements();
    }
  } catch (err) {
    console.warn('⚠️ [PlayHTML] Lỗi setupPlayElements:', err);
  }
}

/**
 * Tạo kênh Realtime cho Bảng Xếp Hạng Thang Bậc OTTv2 (PartyKit / Yjs CRDT)
 */
export function createOttv2LadderChannel(
  onUpdateCallback?: (newLadder: BotProfile[]) => void
): PlayHTMLChannel<BotProfile[]> | null {
  const p = window.playhtml || playhtmlInstance;
  if (!p || typeof p.createPageData !== 'function') return null;

  try {
    console.log('🔄 Đang mở PageDataChannel: ottv2_global_ladder_v2');
    ottv2LadderChannel = p.createPageData<BotProfile[]>('ottv2_global_ladder_v2', []);

    if (typeof onUpdateCallback === 'function') {
      ottv2LadderChannel.onUpdate((newLadder) => {
        console.log('⚡ [PlayHTML OTTv2 Ladder] Nhận bảng xếp hạng mới qua WebSocket:', newLadder);
        onUpdateCallback(newLadder);
      });
    }

    return ottv2LadderChannel;
  } catch (err) {
    console.warn('⚠️ [PlayHTML] Không thể tạo ottv2LadderChannel:', err);
    return null;
  }
}

export function getSharedOttv2Ladder(): BotProfile[] {
  if (!ottv2LadderChannel) return [];
  try {
    const data = ottv2LadderChannel.getData();
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

export function broadcastOttv2Ladder(newLadder: BotProfile[]): void {
  if (!ottv2LadderChannel || !Array.isArray(newLadder)) return;
  try {
    // Luôn lọc bỏ trùng lặp trước khi phát sóng lên WebSocket
    const seenNames = new Set<string>();
    const deduplicated: BotProfile[] = [];
    for (const bot of newLadder) {
      const key = (bot.name || '').trim().toLowerCase();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        deduplicated.push({
          ...bot,
          avatar: bot.avatar && bot.avatar.includes('http') ? '👤' : (bot.avatar || '👤')
        });
      }
    }
    const normalized = deduplicated.map((b, idx) => ({ ...b, rank: idx + 1 }));
    ottv2LadderChannel.setData(normalized);
    console.log('⚡ [PlayHTML OTTv2] Đã broadcast Thang Bậc Xếp Hạng mới lên Cloud:', normalized.length, 'người');
  } catch (e) {
    console.warn('⚠️ [PlayHTML] Lỗi broadcastOttv2Ladder:', e);
  }
}
