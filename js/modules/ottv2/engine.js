export const BOARD_SIZE = 9;
export const COL_LABELS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
export const ROW_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
export const RED_BASE = { col: 0, row: 0 }; // a1
export const BLUE_BASE = { col: 8, row: 8 }; // i9
export function colToLetter(col) {
    return COL_LABELS[col] || '?';
}
export function rowToNumber(row) {
    return ROW_LABELS[row] || '?';
}
export function posToNotation(pos) {
    return `${colToLetter(pos.col)}${rowToNumber(pos.row)}`;
}
export function notationToPos(notation) {
    if (!notation || notation.length < 2)
        return null;
    const colChar = notation[0].toLowerCase();
    const rowChar = notation.substring(1);
    const col = COL_LABELS.indexOf(colChar);
    const row = ROW_LABELS.indexOf(rowChar);
    if (col < 0 || row < 0)
        return null;
    return { col, row };
}
export function getPieceEmoji(type) {
    switch (type) {
        case 'rock':
            return '✊';
        case 'paper':
            return '🖐️';
        case 'scissors':
            return '✌️';
    }
}
export function getPieceNameVi(type) {
    switch (type) {
        case 'rock':
            return 'Búa (Đấm)';
        case 'paper':
            return 'Bao (Lá)';
        case 'scissors':
            return 'Kéo';
    }
}
/**
 * Quy tắc khắc chế Oẳn Tù Tì:
 * ✊ Đấm > ✌️ Kéo > 🖐️ Lá > ✊ Đấm
 */
export function canBeat(attacker, defender) {
    if (attacker === 'rock' && defender === 'scissors')
        return true;
    if (attacker === 'scissors' && defender === 'paper')
        return true;
    if (attacker === 'paper' && defender === 'rock')
        return true;
    return false;
}
/**
 * Khởi tạo bàn cờ 9x9 với 9 quân Đỏ và 9 quân Xanh
 * Đỏ triển khai quanh a1 (cols 0-2, rows 0-2)
 * Xanh triển khai quanh i9 (cols 6-8, rows 6-8)
 */
export function createInitialBoard() {
    const grid = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
    const pieces = [];
    // Red layout: 3x3 at bottom-left (a1 to c3)
    const redSetup = [
        ['scissors', 'rock', 'paper'], // a1, b1, c1
        ['rock', 'scissors', 'paper'], // a2, b2, c2
        ['paper', 'rock', 'scissors'], // a3, b3, c3
    ];
    let idCounter = 1;
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const piece = {
                id: `red_${idCounter++}`,
                type: redSetup[r][c],
                color: 'red',
                col: c,
                row: r,
            };
            grid[r][c] = piece;
            pieces.push(piece);
        }
    }
    // Blue layout: 3x3 at top-right (g7 to i9)
    const blueSetup = [
        ['scissors', 'rock', 'paper'], // g7, h7, i7
        ['paper', 'scissors', 'rock'], // g8, h8, i8
        ['rock', 'paper', 'scissors'], // g9, h9, i9
    ];
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const gridRow = 6 + r;
            const gridCol = 6 + c;
            const piece = {
                id: `blue_${idCounter++}`,
                type: blueSetup[r][c],
                color: 'blue',
                col: gridCol,
                row: gridRow,
            };
            grid[gridRow][gridCol] = piece;
            pieces.push(piece);
        }
    }
    return {
        grid,
        pieces,
        turn: 'red',
        turnCount: 1,
        winner: null,
        winReason: null,
        history: [],
    };
}
/**
 * Lấy danh sách nước đi hợp lệ cho 1 quân cờ (8 hướng di chuyển)
 */
export function getValidMovesForPiece(state, piece) {
    if (state.winner !== null || piece.color !== state.turn)
        return [];
    const moves = [];
    const directions = [
        { dc: -1, dr: -1 }, { dc: 0, dr: -1 }, { dc: 1, dr: -1 },
        { dc: -1, dr: 0 }, { dc: 1, dr: 0 },
        { dc: -1, dr: 1 }, { dc: 0, dr: 1 }, { dc: 1, dr: 1 },
    ];
    for (const { dc, dr } of directions) {
        const targetCol = piece.col + dc;
        const targetRow = piece.row + dr;
        // Kiểm tra biên bàn cờ 9x9
        if (targetCol < 0 || targetCol >= BOARD_SIZE || targetRow < 0 || targetRow >= BOARD_SIZE) {
            continue;
        }
        const targetCell = state.grid[targetRow][targetCol];
        if (!targetCell) {
            // Ô trống: Đi được bình thường
            moves.push({
                pieceId: piece.id,
                from: { col: piece.col, row: piece.row },
                to: { col: targetCol, row: targetRow },
            });
        }
        else if (targetCell.color === piece.color) {
            // Quân đồng minh: Không thể đi vào
            continue;
        }
        else {
            // Quân địch: Chỉ ăn được nếu quy tắc khắc chế thắng
            if (canBeat(piece.type, targetCell.type)) {
                moves.push({
                    pieceId: piece.id,
                    from: { col: piece.col, row: piece.row },
                    to: { col: targetCol, row: targetRow },
                });
            }
        }
    }
    return moves;
}
/**
 * Lấy tất cả nước đi hợp lệ của bên đang đến lượt
 */
export function getAllValidMoves(state, color = state.turn) {
    if (state.winner !== null)
        return [];
    const validMoves = [];
    for (const piece of state.pieces) {
        if (piece.color === color) {
            const pieceMoves = getValidMovesForPiece(state, piece);
            validMoves.push(...pieceMoves);
        }
    }
    return validMoves;
}
/**
 * Thực hiện 1 nước đi và trả về trạng thái mới của bàn cờ
 */
export function applyMove(state, move) {
    if (state.winner !== null)
        return state;
    const piece = state.pieces.find(p => p.id === move.pieceId);
    if (!piece)
        return state;
    // Clone grid & pieces sâu
    const newGrid = state.grid.map(row => [...row]);
    let newPieces = state.pieces.map(p => ({ ...p }));
    const movingPiece = newPieces.find(p => p.id === move.pieceId);
    const targetCell = newGrid[move.to.row][move.to.col];
    let capturedType;
    // Nếu ô đến có quân địch và bị ăn
    if (targetCell && targetCell.color !== movingPiece.color) {
        capturedType = targetCell.type;
        newPieces = newPieces.filter(p => p.id !== targetCell.id);
    }
    // Cập nhật vị trí trên grid
    newGrid[movingPiece.row][movingPiece.col] = null;
    movingPiece.col = move.to.col;
    movingPiece.row = move.to.row;
    newGrid[move.to.row][move.to.col] = movingPiece;
    // Ghi nhật ký nước đi
    const fromNot = posToNotation(move.from);
    const toNot = posToNotation(move.to);
    const emoji = getPieceEmoji(movingPiece.type);
    const notation = capturedType
        ? `${fromNot} ➔ ${toNot} (${emoji} ăn ${getPieceEmoji(capturedType)})`
        : `${fromNot} ➔ ${toNot} (${emoji})`;
    const record = {
        notation,
        fromNotation: fromNot,
        toNotation: toNot,
        pieceType: movingPiece.type,
        color: movingPiece.color,
        captured: capturedType,
    };
    const nextTurn = state.turn === 'red' ? 'blue' : 'red';
    let winner = null;
    let winReason = null;
    // Điều kiện 1: Chiếm căn cứ đối phương
    if (movingPiece.color === 'red' && movingPiece.col === BLUE_BASE.col && movingPiece.row === BLUE_BASE.row) {
        winner = 'red';
        winReason = '🚩 Phe Đỏ đã chiếm thành công Căn cứ đối phương tại i9!';
    }
    else if (movingPiece.color === 'blue' && movingPiece.col === RED_BASE.col && movingPiece.row === RED_BASE.row) {
        winner = 'blue';
        winReason = '🚩 Phe Xanh đã chiếm thành công Căn cứ đối phương tại a1!';
    }
    // Điều kiện 2: Diệt sạch quân đối thủ
    if (!winner) {
        const nextPlayerPieces = newPieces.filter(p => p.color === nextTurn);
        if (nextPlayerPieces.length === 0) {
            winner = movingPiece.color;
            winReason = `⚔️ ${movingPiece.color === 'red' ? 'Phe Đỏ' : 'Phe Xanh'} đã diệt sạch toàn bộ 9 quân của đối thủ!`;
        }
    }
    // Điều kiện 3: Đối thủ không còn nước đi hợp lệ (Khóa cờ)
    if (!winner) {
        const tempState = {
            grid: newGrid,
            pieces: newPieces,
            turn: nextTurn,
            turnCount: state.turnCount + 1,
            winner: null,
            winReason: null,
            history: [...state.history, record],
        };
        const nextMoves = getAllValidMoves(tempState, nextTurn);
        if (nextMoves.length === 0) {
            winner = movingPiece.color;
            winReason = `🚫 Đối thủ (${nextTurn === 'red' ? 'Phe Đỏ' : 'Phe Xanh'}) không còn nước đi hợp lệ nào!`;
        }
    }
    // Điều kiện 4: Giới hạn 200 lượt đi để chống hòa loop vô tận
    if (!winner && state.turnCount >= 200) {
        const redCount = newPieces.filter(p => p.color === 'red').length;
        const blueCount = newPieces.filter(p => p.color === 'blue').length;
        if (redCount > blueCount) {
            winner = 'red';
            winReason = `⏱️ Hết 200 lượt: Phe Đỏ thắng nhờ số lượng quân còn lại nhiều hơn (${redCount} vs ${blueCount})!`;
        }
        else if (blueCount > redCount) {
            winner = 'blue';
            winReason = `⏱️ Hết 200 lượt: Phe Xanh thắng nhờ số lượng quân còn lại nhiều hơn (${blueCount} vs ${redCount})!`;
        }
        else {
            winner = 'draw';
            winReason = '⚖️ Hết 200 lượt: Trận đấu kết thúc với kết quả Hòa!';
        }
    }
    return {
        grid: newGrid,
        pieces: newPieces,
        turn: nextTurn,
        turnCount: state.turnCount + 1,
        winner,
        winReason,
        history: [...state.history, record],
    };
}
//# sourceMappingURL=engine.js.map