import { BotProfile, GauntletState, LadderMatchResult } from '../../types/ottv2.js';
export declare function subscribeGauntletState(cb: (state: GauntletState) => void): void;
/**
 * Tải danh sách Bảng Xếp Hạng hiện tại (từ LocalStorage hoặc PlayHTML)
 */
export declare function loadLadder(): BotProfile[];
/**
 * Lưu danh sách Bảng Xếp Hạng
 */
export declare function saveLadder(ladder: BotProfile[]): void;
/**
 * Reset bảng xếp hạng về mặc định
 */
export declare function resetLadder(): void;
/**
 * Lấy danh sách các trận đấu theo thứ tự từ Rank THẤP NHẤT lên Rank CAO NHẤT
 * Ví dụ: Rank 5 -> Rank 4 -> Rank 3 -> Rank 2 -> Rank 1
 */
export declare function getAscendingLadderQueue(): BotProfile[];
export declare function getGauntletState(): GauntletState;
export declare function updateGauntletState(partial: Partial<GauntletState>): void;
/**
 * Xử lý khi người chơi THUA hoặc THẮNG toàn bộ để CHÈN THỨ HẠNG MỚI
 *
 * @param challengerName Tên người chơi
 * @param defeatedCount Số đối thủ đã đánh bại
 * @param stoppedAtOpponent Đối thủ khiến người chơi bị dừng lại (null nếu thắng hết)
 */
export declare function finalizeGauntletRanking(challengerName: string, challengerAvatar: string, defeatedCount: number, stoppedAtOpponent: BotProfile | null, history: LadderMatchResult[]): {
    newRank: number;
    updatedLadder: BotProfile[];
};
