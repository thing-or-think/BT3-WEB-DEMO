export type PieceType = 'rock' | 'paper' | 'scissors';
export type PieceColor = 'red' | 'blue';
export interface Position {
    col: number;
    row: number;
}
export interface Piece {
    id: string;
    type: PieceType;
    color: PieceColor;
    col: number;
    row: number;
}
export interface Move {
    pieceId: string;
    from: Position;
    to: Position;
}
export interface MoveRecord {
    notation: string;
    fromNotation: string;
    toNotation: string;
    pieceType: PieceType;
    color: PieceColor;
    captured?: PieceType;
}
export interface BoardState {
    grid: (Piece | null)[][];
    pieces: Piece[];
    turn: PieceColor;
    turnCount: number;
    winner: PieceColor | 'draw' | null;
    winReason: string | null;
    history: MoveRecord[];
}
export interface BotProfile {
    id: string;
    name: string;
    avatar: string;
    rank: number;
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Master';
    title: string;
    author: string;
    description: string;
    code: string;
    gistId?: string;
    gistUrl?: string;
    isHumanPlayer?: boolean;
    contestTag?: string;
    lastSubmittedAt?: string;
}
export interface LadderMatchResult {
    rank: number;
    opponent: BotProfile;
    winner: PieceColor | 'draw';
    playerColor: PieceColor;
    winReason: string;
    totalTurns: number;
    history: MoveRecord[];
    timestamp: number;
}
export interface GauntletState {
    ladder: BotProfile[];
    currentLadderIndex: number;
    userRank: number | null;
    status: 'idle' | 'battling' | 'won_stage' | 'game_over' | 'completed_champion';
    matchHistory: LadderMatchResult[];
    activeMatch: BoardState | null;
}
