import { BoardState, BotProfile, Move, PieceColor, Position } from '../../types/ottv2.js';
/**
 * Tính khoảng cách Chebyshev (số bước đi tối thiểu trên bàn cờ 8 hướng)
 */
export declare function chebyshevDist(p1: Position, p2: Position): number;
/**
 * BOT CẤP 5 (BRONZE - Nhập Môn):
 * Nước đi ngẫu nhiên, ưu tiên ăn quân nếu có cơ hội
 */
export declare function botBronze(state: BoardState, color: PieceColor): Move;
/**
 * BOT CẤP 4 (SILVER - Chiến Binh):
 * Ưu tiên chiếm căn cứ đối phương và tiến gần về căn cứ
 */
export declare function botSilver(state: BoardState, color: PieceColor): Move;
/**
 * BOT CẤP 3 (GOLD - Cao Thủ Phản Đòn):
 * Biết bảo vệ căn cứ nhà mình, né các ô mà đối phương có thể ăn
 */
export declare function botGold(state: BoardState, color: PieceColor): Move;
/**
 * BOT CẤP 2 (DIAMOND - Đại Kiện Tướng):
 * Minimax 2 tầng kết hợp phòng thủ căn cứ nghiêm ngặt
 */
export declare function botDiamond(state: BoardState, color: PieceColor): Move;
/**
 * BOT CẤP 1 (MASTER - VÔ ĐỊCH TOÀN MÁY CHỦ):
 * Chiến thuật tổng hợp: rush căn cứ thông minh, bẫy khóa cờ, chặn đường tiến quân
 */
export declare function botMaster(state: BoardState, color: PieceColor): Move;
/**
 * Danh sách Bot Mặc Định cho Bảng Xếp Hạng (Rank 1 đến Rank 5)
 */
export declare const DEFAULT_LADDER_BOTS: BotProfile[];
/**
 * Thực thi nước đi của Bot an toàn với try/catch và timeout
 */
export declare function executeBotMove(bot: BotProfile, state: BoardState, color: PieceColor): Promise<Move>;
