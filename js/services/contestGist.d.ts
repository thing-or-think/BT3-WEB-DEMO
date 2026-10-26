import { BotProfile } from '../types/ottv2.js';
export declare const DEFAULT_CONTEST_TAG = "#ottv2_contest_2026_s1";
/**
 * Lấy Tag cuộc thi hiện tại (kèm hash mùa giải/thời gian thi)
 */
export declare function getActiveContestTag(): string;
/**
 * Cập nhật Tag cuộc thi mới
 */
export declare function setActiveContestTag(tag: string): void;
export interface ContestGistResult {
    code: string;
    gistId: string;
    gistUrl: string;
    updatedAt: string;
    description: string;
    filename: string;
}
/**
 * Tìm và lấy Gist nộp code LẦN CUỐI CÙNG của một người chơi có chứa Tag cuộc thi
 *
 * @param username Tên GitHub của người chơi (có thể có hoặc không có '@')
 * @param contestTag Hash tag cuộc thi (ví dụ: #ottv2_contest_2026_s1)
 */
export declare function fetchPlayerLatestContestGist(username: string, contestTag?: string): Promise<ContestGistResult | null>;
/**
 * Quét toàn bộ danh bạ thành viên cộng đồng để tìm những người chơi đã nộp Bot
 */
export declare function scanCommunityPlayersWithContestGists(usernames: string[], contestTag?: string): Promise<BotProfile[]>;
