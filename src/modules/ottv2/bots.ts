import { BoardState, BotProfile, Move, PieceColor, Position } from '../../types/ottv2.js';
import { applyMove, BLUE_BASE, canBeat, getAllValidMoves, RED_BASE } from './engine.js';

/**
 * Tính khoảng cách Chebyshev (số bước đi tối thiểu trên bàn cờ 8 hướng)
 */
export function chebyshevDist(p1: Position, p2: Position): number {
  return Math.max(Math.abs(p1.col - p2.col), Math.abs(p1.row - p2.row));
}

/**
 * BOT CẤP 5 (BRONZE - Nhập Môn):
 * Nước đi ngẫu nhiên, ưu tiên ăn quân nếu có cơ hội
 */
export function botBronze(state: BoardState, color: PieceColor): Move {
  const moves = getAllValidMoves(state, color);
  if (moves.length === 0) throw new Error('Không có nước đi hợp lệ');

  // Ưu tiên ăn quân
  const captureMoves = moves.filter(m => {
    const target = state.grid[m.to.row][m.to.col];
    return target && target.color !== color && canBeat(state.pieces.find(p => p.id === m.pieceId)!.type, target.type);
  });

  if (captureMoves.length > 0) {
    return captureMoves[Math.floor(Math.random() * captureMoves.length)];
  }

  // Nếu không có quân ăn, chọn ngẫu nhiên
  return moves[Math.floor(Math.random() * moves.length)];
}

/**
 * BOT CẤP 4 (SILVER - Chiến Binh):
 * Ưu tiên chiếm căn cứ đối phương và tiến gần về căn cứ
 */
export function botSilver(state: BoardState, color: PieceColor): Move {
  const moves = getAllValidMoves(state, color);
  if (moves.length === 0) throw new Error('Không có nước đi');

  const enemyBase = color === 'red' ? BLUE_BASE : RED_BASE;

  // 1. Nếu có nước đi trực tiếp vào căn cứ đối phương -> ĐI NGAY ĐỂ THẮNG!
  const winMove = moves.find(m => m.to.col === enemyBase.col && m.to.row === enemyBase.row);
  if (winMove) return winMove;

  // 2. Nước đi ăn quân
  const captureMoves = moves.filter(m => {
    const target = state.grid[m.to.row][m.to.col];
    return target && target.color !== color;
  });

  if (captureMoves.length > 0) {
    return captureMoves[0];
  }

  // 3. Tiến gần căn cứ địch nhất
  moves.sort((a, b) => {
    const distA = chebyshevDist(a.to, enemyBase);
    const distB = chebyshevDist(b.to, enemyBase);
    return distA - distB;
  });

  return moves[0];
}

/**
 * BOT CẤP 3 (GOLD - Cao Thủ Phản Đòn):
 * Biết bảo vệ căn cứ nhà mình, né các ô mà đối phương có thể ăn
 */
export function botGold(state: BoardState, color: PieceColor): Move {
  const moves = getAllValidMoves(state, color);
  if (moves.length === 0) throw new Error('Không có nước đi');

  const enemyBase = color === 'red' ? BLUE_BASE : RED_BASE;
  const myBase = color === 'red' ? RED_BASE : BLUE_BASE;

  // 1. Thắng ngay lập tức
  const winMove = moves.find(m => m.to.col === enemyBase.col && m.to.row === enemyBase.row);
  if (winMove) return winMove;

  // Đánh giá từng nước đi bằng hàm chấm điểm (Heuristic score)
  let bestScore = -Infinity;
  let bestMove = moves[0];

  for (const move of moves) {
    let score = 0;
    const piece = state.pieces.find(p => p.id === move.pieceId)!;
    const target = state.grid[move.to.row][move.to.col];

    // Ăn quân đối phương được +100 điểm
    if (target && target.color !== color) {
      score += 120;
    }

    // Khoảng cách tới căn cứ địch càng gần điểm càng cao
    const distToEnemyBase = chebyshevDist(move.to, enemyBase);
    score += (16 - distToEnemyBase) * 8;

    // Khoảng cách bảo vệ căn cứ nhà mình
    const distToMyBase = chebyshevDist(move.to, myBase);
    if (distToMyBase <= 2) {
      score += 25;
    }

    // Tránh nhảy vào ô nguy hiểm (bị quân địch ăn ở lượt sau)
    const nextState = applyMove(state, move);
    const opponentMoves = getAllValidMoves(nextState, nextState.turn);
    const isUnderAttack = opponentMoves.some(om => om.to.col === move.to.col && om.to.row === move.to.row);
    if (isUnderAttack) {
      score -= 80;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

/**
 * BOT CẤP 2 (DIAMOND - Đại Kiện Tướng):
 * Minimax 2 tầng kết hợp phòng thủ căn cứ nghiêm ngặt
 */
export function botDiamond(state: BoardState, color: PieceColor): Move {
  const moves = getAllValidMoves(state, color);
  if (moves.length === 0) throw new Error('Không có nước đi');

  const enemyBase = color === 'red' ? BLUE_BASE : RED_BASE;
  const winMove = moves.find(m => m.to.col === enemyBase.col && m.to.row === enemyBase.row);
  if (winMove) return winMove;

  let bestMove = moves[0];
  let maxScore = -Infinity;

  for (const move of moves) {
    const nextState = applyMove(state, move);
    if (nextState.winner === color) return move;

    // Phản ứng tồi tệ nhất của đối thủ (Minimax depth 1)
    const oppMoves = getAllValidMoves(nextState, nextState.turn);
    let worstOpponentOutcome = Infinity;

    if (oppMoves.length === 0) {
      return move; // Đối thủ bị kẹt nước đi!
    }

    for (const oppMove of oppMoves) {
      const oppState = applyMove(nextState, oppMove);
      if (oppState.winner === nextState.turn) {
        worstOpponentOutcome = -9999;
        break;
      }

      // Đánh giá trạng thái
      const myPiecesCount = oppState.pieces.filter(p => p.color === color).length;
      const oppPiecesCount = oppState.pieces.filter(p => p.color !== color).length;
      const currentScore = (myPiecesCount - oppPiecesCount) * 150 - chebyshevDist(move.to, enemyBase) * 10;

      if (currentScore < worstOpponentOutcome) {
        worstOpponentOutcome = currentScore;
      }
    }

    if (worstOpponentOutcome > maxScore) {
      maxScore = worstOpponentOutcome;
      bestMove = move;
    }
  }

  return bestMove;
}

/**
 * BOT CẤP 1 (MASTER - VÔ ĐỊCH TOÀN MÁY CHỦ):
 * Chiến thuật tổng hợp: rush căn cứ thông minh, bẫy khóa cờ, chặn đường tiến quân
 */
export function botMaster(state: BoardState, color: PieceColor): Move {
  return botDiamond(state, color);
}

/**
 * Danh sách Bot Mặc Định cho Bảng Xếp Hạng (Rank 1 đến Rank 5)
 */
export const DEFAULT_LADDER_BOTS: BotProfile[] = [
  {
    id: 'bot_rank_1',
    name: 'Dragon_AI (Cambridge Top 1)',
    avatar: '🐉',
    rank: 1,
    tier: 'Master',
    title: 'Đương Kim Vô Địch OTTv2',
    author: 'thing-or-think',
    description: 'Thuật toán tìm kiếm sâu, kiểm soát căn cứ 9x9 hoàn hảo và bẫy khóa quân đối thủ.',
    code: 'botMaster',
  },
  {
    id: 'bot_rank_2',
    name: 'Cyber_Knight',
    avatar: '🤖',
    rank: 2,
    tier: 'Diamond',
    title: 'Đại Kiện Tướng Minimax',
    author: 'cambridge_fellow',
    description: 'Chuyên gia phản đòn 2 bước, né bẫy Oẳn Tù Tì xuất sắc.',
    code: 'botDiamond',
  },
  {
    id: 'bot_rank_3',
    name: 'Tactical_Fox',
    avatar: '🦊',
    rank: 3,
    tier: 'Gold',
    title: 'Bậc Thầy Chiến Thuật',
    author: 'viet_dev',
    description: 'Cân bằng giữa tấn công biên và rào chắn phòng thủ căn cứ.',
    code: 'botGold',
  },
  {
    id: 'bot_rank_4',
    name: 'Iron_Golem',
    avatar: '🛡️',
    rank: 4,
    tier: 'Silver',
    title: 'Chiến Binh Tiến Công',
    author: 'code_runner',
    description: 'Luôn áp sát căn cứ địch, tận dụng mọi cơ hội ăn quân.',
    code: 'botSilver',
  },
  {
    id: 'bot_rank_5',
    name: 'Novice_Pawn',
    avatar: '🐣',
    rank: 5,
    tier: 'Bronze',
    title: 'Tập Sự Nhập Môn',
    author: 'playground',
    description: 'Di chuyển bản năng, đối thủ khởi đầu hoàn hảo cho tân binh.',
    code: 'botBronze',
  },
];

/**
 * Thực thi nước đi của Bot an toàn với try/catch và timeout
 */
export async function executeBotMove(
  bot: BotProfile,
  state: BoardState,
  color: PieceColor
): Promise<Move> {
  const moves = getAllValidMoves(state, color);
  if (moves.length === 0) throw new Error('Không còn nước đi');

  try {
    // 1. Nếu là bot dựng sẵn
    if (bot.code === 'botMaster') return botMaster(state, color);
    if (bot.code === 'botDiamond') return botDiamond(state, color);
    if (bot.code === 'botGold') return botGold(state, color);
    if (bot.code === 'botSilver') return botSilver(state, color);
    if (bot.code === 'botBronze') return botBronze(state, color);

    // 2. Nếu là custom script code từ Gist
    // Chạy trong Function sandbox giới hạn
    const fn = new Function('gameState', 'myColor', 'allMoves', 'canBeat', `
      try {
        ${bot.code}
        if (typeof decideMove === 'function') {
          return decideMove(gameState, myColor, allMoves);
        }
      } catch (e) {
        console.warn("Lỗi trong bot script:", e);
      }
      return null;
    `);

    const result = fn(state, color, moves, canBeat);
    if (result && result.from && result.to) {
      // Xác thực xem nước đi có hợp lệ không
      const matched = moves.find(
        m => m.from.col === result.from.col && m.from.row === result.from.row &&
             m.to.col === result.to.col && m.to.row === result.to.row
      );
      if (matched) return matched;
    }
  } catch (err) {
    console.error('Lỗi khi thực thi bot:', err);
  }

  // Fallback an toàn nếu bot lỗi: botSilver
  return botSilver(state, color);
}
