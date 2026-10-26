import { BotProfile, GauntletState, LadderMatchResult } from '../../types/ottv2.js';
import { DEFAULT_LADDER_BOTS } from './bots.js';
import { scanCommunityPlayersWithContestGists, getActiveContestTag } from '../../services/contestGist.js';

const STORAGE_KEY = 'ottv2_gauntlet_ladder_v1';

let gauntletState: GauntletState = {
  ladder: [...DEFAULT_LADDER_BOTS],
  currentLadderIndex: 0,
  userRank: null,
  status: 'idle',
  matchHistory: [],
  activeMatch: null,
};

let onLadderChangeCallbacks: Array<(state: GauntletState) => void> = [];

export function subscribeGauntletState(cb: (state: GauntletState) => void): void {
  onLadderChangeCallbacks.push(cb);
  cb(gauntletState);
}

function notifySubscribers(): void {
  onLadderChangeCallbacks.forEach(cb => cb({ ...gauntletState }));
}

/**
 * Tải danh sách Bảng Xếp Hạng hiện tại (từ LocalStorage hoặc PlayHTML)
 */
export function loadLadder(): BotProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Tự động dọn dẹp dữ liệu cũ nếu bị lưu nhầm URL avatar vào tên hoặc avatar
        let cachedUsername = '';
        try { cachedUsername = localStorage.getItem('cached_gh_username') || ''; } catch (_) {}
        const defaultGitName = cachedUsername ? `@${cachedUsername}` : '@GitPlayer';

        const cleaned: BotProfile[] = parsed.map((bot: BotProfile) => {
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
  } catch (err) {
    console.warn('Không thể nạp ladder từ localStorage:', err);
  }

  gauntletState.ladder = [...DEFAULT_LADDER_BOTS];
  notifySubscribers();
  return gauntletState.ladder;
}

/**
 * Lưu danh sách Bảng Xếp Hạng
 */
export function saveLadder(ladder: BotProfile[]): void {
  // Chuẩn hóa lại rank từ 1 đến N
  const normalized = ladder.map((bot, idx) => ({
    ...bot,
    rank: idx + 1,
  }));
  gauntletState.ladder = normalized;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch (e) {
    console.warn('Lỗi lưu ladder:', e);
  }
  notifySubscribers();
}

/**
 * Reset bảng xếp hạng về mặc định
 */
export function resetLadder(): void {
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
export function getAscendingLadderQueue(): BotProfile[] {
  const currentLadder = [...gauntletState.ladder];
  // Sắp xếp rank từ lớn đến bé (ví dụ: rank 5 trước, rank 1 sau cùng)
  return currentLadder.sort((a, b) => b.rank - a.rank);
}

export function getGauntletState(): GauntletState {
  return gauntletState;
}

export function updateGauntletState(partial: Partial<GauntletState>): void {
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
export function finalizeGauntletRanking(
  challengerName: string,
  challengerAvatar: string,
  defeatedCount: number,
  stoppedAtOpponent: BotProfile | null,
  history: LadderMatchResult[]
): { newRank: number; updatedLadder: BotProfile[] } {
  const ladder = [...gauntletState.ladder];

  let newRank: number;

  if (stoppedAtOpponent === null) {
    // THẮNG TOÀN BỘ (Hạ gục cả Rank 1): Trở thành TÂN VÔ ĐỊCH RANK 1
    newRank = 1;
  } else {
    // THUA tại đối thủ có thứ hạng stoppedAtOpponent.rank
    // Quy tắc: Chèn vào vị trí NGAY SAU đối thủ vừa thua
    // Ví dụ: Thua Rank 3 -> Vị trí mới là Rank 4 (người đứng Rank 4 cũ tụt xuống 5)
    newRank = stoppedAtOpponent.rank + 1;
  }

  // Đảm bảo tên hiển thị chuẩn là Tên Git (@username), tuyệt đối không để URL avatar
  let cleanName = (challengerName || '').trim();
  if (!cleanName || cleanName.includes('http') || cleanName.includes('avatars.githubusercontent.com')) {
    let cached = '';
    try { cached = localStorage.getItem('cached_gh_username') || ''; } catch (_) {}
    cleanName = cached ? `@${cached}` : '@GitPlayer';
  } else if (!cleanName.startsWith('@')) {
    cleanName = `@${cleanName}`;
  }

  // Avatar luôn là emoji đại diện, không chứa chuỗi URL
  const cleanAvatar = challengerAvatar && !challengerAvatar.includes('http') ? challengerAvatar : '👤';

  const newProfile: BotProfile = {
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

/**
 * Quét danh bạ cộng đồng và đồng bộ các người chơi đã nộp Gist vào Tháp Đấu
 */
export async function syncLadderWithCommunityGists(communityUsers: string[]): Promise<BotProfile[]> {
  const contestTag = getActiveContestTag();
  const playerBots = await scanCommunityPlayersWithContestGists(communityUsers, contestTag);

  if (playerBots.length === 0) return gauntletState.ladder;

  const currentLadder = [...gauntletState.ladder];

  for (const playerBot of playerBots) {
    const existingIdx = currentLadder.findIndex(
      b => b.name.toLowerCase() === playerBot.name.toLowerCase() ||
           b.author.toLowerCase() === playerBot.author.toLowerCase()
    );

    if (existingIdx >= 0) {
      // Cập nhật thông tin nộp bài mới nhất
      currentLadder[existingIdx] = {
        ...currentLadder[existingIdx],
        code: playerBot.code,
        gistId: playerBot.gistId,
        gistUrl: playerBot.gistUrl,
        lastSubmittedAt: playerBot.lastSubmittedAt,
        description: playerBot.description,
        isHumanPlayer: true,
      };
    } else {
      // Chèn người chơi mới vào ladder (ở phân khúc Hạng 3 / 4)
      currentLadder.splice(2, 0, playerBot);
    }
  }

  saveLadder(currentLadder);
  return gauntletState.ladder;
}
