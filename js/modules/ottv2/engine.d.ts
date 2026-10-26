import { BoardState, Move, Piece, PieceColor, PieceType, Position } from '../../types/ottv2.js';
export declare const BOARD_SIZE = 9;
export declare const COL_LABELS: string[];
export declare const ROW_LABELS: string[];
export declare const RED_BASE: Position;
export declare const BLUE_BASE: Position;
export declare function colToLetter(col: number): string;
export declare function rowToNumber(row: number): string;
export declare function posToNotation(pos: Position): string;
export declare function notationToPos(notation: string): Position | null;
export declare function getPieceEmoji(type: PieceType): string;
export declare function getPieceNameVi(type: PieceType): string;
/**
 * Quy tắc khắc chế Oẳn Tù Tì:
 * ✊ Đấm > ✌️ Kéo > 🖐️ Lá > ✊ Đấm
 */
export declare function canBeat(attacker: PieceType, defender: PieceType): boolean;
/**
 * Khởi tạo bàn cờ 9x9 với 9 quân Đỏ và 9 quân Xanh
 * Đỏ triển khai quanh a1 (cols 0-2, rows 0-2)
 * Xanh triển khai quanh i9 (cols 6-8, rows 6-8)
 */
export declare function createInitialBoard(): BoardState;
/**
 * Lấy danh sách nước đi hợp lệ cho 1 quân cờ (8 hướng di chuyển)
 */
export declare function getValidMovesForPiece(state: BoardState, piece: Piece): Move[];
/**
 * Lấy tất cả nước đi hợp lệ của bên đang đến lượt
 */
export declare function getAllValidMoves(state: BoardState, color?: PieceColor): Move[];
/**
 * Thực hiện 1 nước đi và trả về trạng thái mới của bàn cờ
 */
export declare function applyMove(state: BoardState, move: Move): BoardState;
