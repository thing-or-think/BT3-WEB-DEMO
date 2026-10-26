import { DEFAULT_LADDER_BOTS } from './bots.js';
const STORAGE_KEY = 'ottv2_gauntlet_ladder_v1';
let gauntletState = {
    ladder: [...DEFAULT_LADDER_BOTS],
    currentLadderIndex: 0,
    userRank: null,
    status: 'idle',
    matchHistory: [],
    activeMatch: null,
};
let onLadderChangeCallbacks = [];
export function subscribeGauntletState(cb) {
    onLadderChangeCallbacks.push(cb);
    cb(gauntletState);
}
function notifySubscribers() {
    onLadderChangeCallbacks.forEach(cb => cb({ ...gauntletState }));
}
/**
 * Tải danh sách Bảng Xếp Hạng hiện tại (từ LocalStorage hoặc PlayHTML)
 */
export function loadLadder() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Tự động dọn dẹp dữ liệu cũ nếu bị lưu nhầm URL avatar vào tên hoặc avatar
                let cachedUsername = '';
                try {
                    cachedUsername = localStorage.getItem('cached_gh_username') || '';
                }
                catch (_) { }
                const defaultGitName = cachedUsername ? `@${cachedUsername}` : '@GitPlayer';
                const cleaned = parsed.map((bot) => {
                    let updatedName = bot.name || defaultGitName;
                    let updatedAvatar = bot.avatar || '👤';
                    // Nếu name bị lưu nhầm thành đường link avatar URL
                    if (updatedName.includes('http') || updatedName.includes('avatars.githubusercontent.com')) {
                        updatedName = defaultGitName;
                    }
                    // Nếu avatar bị lưu dạng text URL thay vì icon
                    if (updatedAvatar.includes('http') || updatedAvatar.includes('avatars.githubusercontent.com')) {
                        updatedAvatar = '👤';
                    }
                    return {
                        ...bot,
                        name: updatedName,
                        avatar: updatedAvatar,
                    };
                });
                gauntletState.ladder = cleaned;
                notifySubscribers();
                return cleaned;
            }
        }
    }
    catch (err) {
        console.warn('Không thể nạp ladder từ localStorage:', err);
    }
    gauntletState.ladder = [...DEFAULT_LADDER_BOTS];
    notifySubscribers();
    return gauntletState.ladder;
}
/**
 * Lưu danh sách Bảng Xếp Hạng
 */
export function saveLadder(ladder) {
    // Chuẩn hóa lại rank từ 1 đến N
    const normalized = ladder.map((bot, idx) => ({
        ...bot,
        rank: idx + 1,
    }));
    gauntletState.ladder = normalized;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }
    catch (e) {
        console.warn('Lỗi lưu ladder:', e);
    }
    notifySubscribers();
}
/**
 * Reset bảng xếp hạng về mặc định
 */
export function resetLadder() {
    localStorage.removeItem(STORAGE_KEY);
    gauntletState.ladder = [...DEFAULT_LADDER_BOTS];
    gauntletState.status = 'idle';
    gauntletState.userRank = null;
    gauntletState.matchHistory = [];
    gauntletState.currentLadderIndex = 0;
    saveLadder(gauntletState.ladder);
}
/**
 * Lấy danh sách các trận đấu theo thứ tự từ Rank THẤP NHẤT lên Rank CAO NHẤT
 * Ví dụ: Rank 5 -> Rank 4 -> Rank 3 -> Rank 2 -> Rank 1
 */
export function getAscendingLadderQueue() {
    const currentLadder = [...gauntletState.ladder];
    // Sắp xếp rank từ lớn đến bé (ví dụ: rank 5 trước, rank 1 sau cùng)
    return currentLadder.sort((a, b) => b.rank - a.rank);
}
export function getGauntletState() {
    return gauntletState;
}
export function updateGauntletState(partial) {
    gauntletState = { ...gauntletState, ...partial };
    notifySubscribers();
}
/**
 * Xử lý khi người chơi THUA hoặc THẮNG toàn bộ để CHÈN THỨ HẠNG MỚI
 *
 * @param challengerName Tên người chơi
 * @param defeatedCount Số đối thủ đã đánh bại
 * @param stoppedAtOpponent Đối thủ khiến người chơi bị dừng lại (null nếu thắng hết)
 */
export function finalizeGauntletRanking(challengerName, challengerAvatar, defeatedCount, stoppedAtOpponent, history) {
    const ladder = [...gauntletState.ladder];
    let newRank;
    if (stoppedAtOpponent === null) {
        // THẮNG TOÀN BỘ (Hạ gục cả Rank 1): Trở thành TÂN VÔ ĐỊCH RANK 1
        newRank = 1;
    }
    else {
        // THUA tại đối thủ có thứ hạng stoppedAtOpponent.rank
        // Quy tắc: Chèn vào vị trí NGAY SAU đối thủ vừa thua
        // Ví dụ: Thua Rank 3 -> Vị trí mới là Rank 4 (người đứng Rank 4 cũ tụt xuống 5)
        newRank = stoppedAtOpponent.rank + 1;
    }
    // Đảm bảo tên hiển thị chuẩn là Tên Git (@username), tuyệt đối không để URL avatar
    let cleanName = (challengerName || '').trim();
    if (!cleanName || cleanName.includes('http') || cleanName.includes('avatars.githubusercontent.com')) {
        let cached = '';
        try {
            cached = localStorage.getItem('cached_gh_username') || '';
        }
        catch (_) { }
        cleanName = cached ? `@${cached}` : '@GitPlayer';
    }
    else if (!cleanName.startsWith('@')) {
        cleanName = `@${cleanName}`;
    }
    // Avatar luôn là emoji đại diện, không chứa chuỗi URL
    const cleanAvatar = challengerAvatar && !challengerAvatar.includes('http') ? challengerAvatar : '👤';
    const newProfile = {
        id: `user_ranked_${Date.now()}`,
        name: cleanName,
        avatar: cleanAvatar,
        rank: newRank,
        tier: newRank === 1 ? 'Master' : newRank <= 2 ? 'Diamond' : newRank <= 3 ? 'Gold' : newRank <= 5 ? 'Silver' : 'Bronze',
        title: newRank === 1 ? '👑 Tân Vô Địch OTTv2' : `Top ${newRank} Tháp Đấu`,
        author: cleanName,
        description: `Đã leo tháp xuất sắc đánh bại ${defeatedCount} cao thủ!`,
        code: 'botGold',
    };
    // Chèn vào mảng ladder
    const insertIndex = newRank - 1;
    ladder.splice(insertIndex, 0, newProfile);
    // Cập nhật lại số thứ tự rank cho toàn bộ danh sách
    const updatedLadder = ladder.map((bot, idx) => ({
        ...bot,
        rank: idx + 1,
    }));
    saveLadder(updatedLadder);
    gauntletState.userRank = newRank;
    gauntletState.ladder = updatedLadder;
    gauntletState.status = stoppedAtOpponent === null ? 'completed_champion' : 'game_over';
    gauntletState.matchHistory = history;
    notifySubscribers();
    return { newRank, updatedLadder };
}
//# sourceMappingURL=ladder.js.map