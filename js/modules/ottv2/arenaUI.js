import { applyMove, BOARD_SIZE, createInitialBoard, getPieceEmoji, getPieceNameVi, getValidMovesForPiece, RED_BASE, BLUE_BASE, } from './engine.js';
import { executeBotMove } from './bots.js';
import { finalizeGauntletRanking, getAscendingLadderQueue, getGauntletState, loadLadder, resetLadder, subscribeGauntletState, syncLadderWithCommunityGists, } from './ladder.js';
import { getActiveContestTag, setActiveContestTag, fetchPlayerLatestContestGist, } from '../../services/contestGist.js';
import { loadBotTemplateIntoEditor } from '../editor.js';
import { state } from '../state.js';
import { showSuccess, showError } from '../../utils/dom.js';
let currentBoard = createInitialBoard();
let selectedPiece = null;
let highlightedMoves = [];
let autoPlayInterval = null;
let simulationSpeedMs = 400; // Mặc định 400ms / nước
// Trạng thái phiên Leo Rank
let gauntletQueue = [];
let currentQueueIndex = 0; // Đang đấu với ai trong queue
let playerControlMode = 'my_gist'; // MẶC ĐỊNH LÀ BOT TỰ ĐỘNG CHƠI
let myGistBotCode = null;
let defeatedOpponentsCount = 0;
let isGauntletActive = false;
export function initArenaUI() {
    loadLadder();
    renderBoard();
    renderLadderSidebar();
    setupEventListeners();
    subscribeGauntletState(() => {
        renderLadderSidebar();
    });
}
/**
 * Thiết lập các sự kiện nút bấm trên giao diện
 */
function setupEventListeners() {
    // Input Tag cuộc thi
    const inputContestTag = document.getElementById('input-contest-tag');
    if (inputContestTag) {
        inputContestTag.value = getActiveContestTag();
        inputContestTag.addEventListener('change', () => {
            const val = inputContestTag.value.trim();
            if (val) {
                setActiveContestTag(val);
                showSuccess(`Đã lưu tag cuộc thi: ${val}`);
            }
        });
    }
    // Nút Quét Gist Cộng Đồng
    const btnSyncGists = document.getElementById('btn-sync-contest-gists');
    if (btnSyncGists) {
        btnSyncGists.addEventListener('click', async () => {
            btnSyncGists.textContent = '⏳ Đang quét...';
            try {
                appendGameLog(`🔍 Đang quét Gist của các thành viên cộng đồng theo tag "${getActiveContestTag()}"...`);
                const updated = await syncLadderWithCommunityGists(state.communityUsers);
                showSuccess(`Đã đồng bộ xong! Tháp đấu hiện có ${updated.length} đối thủ.`);
                appendGameLog(`✅ Đã đồng bộ Tháp Đấu với các bản nộp Gist mới nhất của cộng đồng!`, 'win');
            }
            catch (_) {
                showError('Không thể quét Gist cộng đồng.');
            }
            finally {
                btnSyncGists.textContent = '🔄 Quét Gist Cộng Đồng';
            }
        });
    }
    // Nút Nộp Bot Của Bạn (Tạo Gist Mẫu)
    const btnCreateGist = document.getElementById('btn-create-contest-gist');
    if (btnCreateGist) {
        btnCreateGist.addEventListener('click', () => {
            loadBotTemplateIntoEditor(getActiveContestTag());
        });
    }
    // Nút bắt đầu Leo Rank
    const btnStartGauntlet = document.getElementById('btn-start-gauntlet');
    if (btnStartGauntlet) {
        btnStartGauntlet.addEventListener('click', startGauntletRun);
    }
    // Nút dừng / đầu hàng
    const btnForfeit = document.getElementById('btn-forfeit-match');
    if (btnForfeit) {
        btnForfeit.addEventListener('click', handleForfeit);
    }
    // Nút mô phỏng nhanh (Instant Match)
    const btnFastSim = document.getElementById('btn-fast-sim');
    if (btnFastSim) {
        btnFastSim.addEventListener('click', runFastSimulation);
    }
    // Tốc độ điều chỉnh
    const speedSelect = document.getElementById('select-sim-speed');
    if (speedSelect) {
        speedSelect.addEventListener('change', (e) => {
            simulationSpeedMs = parseInt(e.target.value, 10);
        });
    }
    // Chế độ chơi của người chơi (Manual, Built-in Bot, My Gist)
    const selectPlayerMode = document.getElementById('select-player-mode');
    if (selectPlayerMode) {
        selectPlayerMode.value = playerControlMode;
        selectPlayerMode.addEventListener('change', async () => {
            playerControlMode = selectPlayerMode.value;
            if (playerControlMode === 'my_gist') {
                let myUser = state.currentUser?.login;
                if (!myUser) {
                    try {
                        myUser = localStorage.getItem('cached_gh_username') || '';
                    }
                    catch (_) { }
                }
                if (myUser) {
                    appendGameLog(`🔍 Đang tải Gist nộp lần cuối của @${myUser} (Tag: ${getActiveContestTag()})...`);
                    const myGist = await fetchPlayerLatestContestGist(myUser, getActiveContestTag());
                    if (myGist && myGist.code) {
                        myGistBotCode = myGist.code;
                        appendGameLog(`✅ Đã nạp thành công Gist của bạn (Cập nhật: ${new Date(myGist.updatedAt).toLocaleTimeString()})!`, 'win');
                    }
                    else {
                        appendGameLog(`⚠️ Chưa tìm thấy Gist có tag ${getActiveContestTag()} của bạn. Bạn hãy bấm "Nộp Bot Của Bạn" để tạo bài!`, 'loss');
                    }
                }
                else {
                    appendGameLog(`⚠️ Bạn chưa đăng nhập GitHub. Vui lòng đăng nhập hoặc nhập token để lấy Gist của bạn!`, 'loss');
                }
            }
            if (playerControlMode !== 'manual' && currentBoard.turn === 'red' && isGauntletActive) {
                stepMatch();
            }
        });
    }
    // Nút reset bảng xếp hạng về mặc định
    const btnResetLadder = document.getElementById('btn-reset-ladder');
    if (btnResetLadder) {
        btnResetLadder.addEventListener('click', () => {
            if (confirm('Bạn có chắc muốn khôi phục Bảng Xếp Hạng về mặc định ban đầu?')) {
                resetLadder();
            }
        });
    }
}
/**
 * Bắt đầu chuỗi Leo Rank từ Rank THẤP NHẤT lên CAO NHẤT
 */
export function startGauntletRun() {
    gauntletQueue = getAscendingLadderQueue();
    if (gauntletQueue.length === 0)
        return;
    currentQueueIndex = 0;
    defeatedOpponentsCount = 0;
    isGauntletActive = true;
    updateGauntletHeaderUI();
    setupMatchAgainstCurrentOpponent();
}
/**
 * Khởi tạo trận đấu với đối thủ hiện tại trong hàng đợi
 */
async function setupMatchAgainstCurrentOpponent() {
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
    }
    const opponent = gauntletQueue[currentQueueIndex];
    if (!opponent)
        return;
    currentBoard = createInitialBoard();
    selectedPiece = null;
    highlightedMoves = [];
    renderBoard();
    renderMatchInfo(opponent);
    appendGameLog(`⚔️ BẮT ĐẦU TRẬN: Bạn (Phe Đỏ) vs ${opponent.name} (Hạng ${opponent.rank} - Phe Xanh)`);
    // NẾU ĐỐI THỦ LÀ NGƯỜI CHƠI THẬT HOẶC CÓ GIST: LẤY BẢN NỘP CUỐI CÙNG
    if (opponent.isHumanPlayer || (opponent.author && !['playground', 'cambridge_fellow', 'code_runner', 'viet_dev'].includes(opponent.author))) {
        appendGameLog(`🔍 Đang kiểm tra bản nộp Gist mới nhất của ${opponent.name}...`);
        try {
            const latestGist = await fetchPlayerLatestContestGist(opponent.author, getActiveContestTag());
            if (latestGist && latestGist.code) {
                opponent.code = latestGist.code;
                opponent.gistId = latestGist.gistId;
                opponent.lastSubmittedAt = latestGist.updatedAt;
                const timeFormatted = new Date(latestGist.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                appendGameLog(`⚡ Đã tải code Gist nộp lần cuối (${timeFormatted}) của ${opponent.name}!`);
            }
        }
        catch (_) { }
    }
    // NẾU BẠN CHỌN CHẾ ĐỘ "DÙNG GIST CỦA TÔI" (MẶC ĐỊNH BOT TỰ CHƠI)
    if (playerControlMode === 'my_gist') {
        let myUser = state.currentUser?.login;
        if (!myUser) {
            try {
                myUser = localStorage.getItem('cached_gh_username') || '';
            }
            catch (_) { }
        }
        if (myUser) {
            try {
                const myGist = await fetchPlayerLatestContestGist(myUser, getActiveContestTag());
                if (myGist && myGist.code) {
                    myGistBotCode = myGist.code;
                    appendGameLog(`🤖 Đang chạy Code Gist mới nhất của bạn (@${myUser})!`, 'win');
                }
                else {
                    appendGameLog(`💡 Chưa tìm thấy Gist tag ${getActiveContestTag()} của bạn. Hệ thống tự động dùng Bot AI đại diện!`);
                }
            }
            catch (_) { }
        }
        else {
            appendGameLog(`💡 Bạn chưa đăng nhập GitHub. Hệ thống tự động dùng Bot AI đại diện thi đấu!`);
        }
    }
    updateGauntletHeaderUI();
    // Bắt đầu vòng lặp trận đấu
    startMatchLoop();
    // THỰC HIỆN NGAY NƯỚC ĐI ĐẦU TIÊN NẾU BOT TỰ ĐỘNG CHƠI
    if (playerControlMode !== 'manual') {
        setTimeout(() => {
            if (isGauntletActive && currentBoard.winner === null && currentBoard.turn === 'red') {
                stepMatch();
            }
        }, 150);
    }
}
/**
 * Vòng lặp trận đấu
 */
function startMatchLoop() {
    if (autoPlayInterval)
        clearInterval(autoPlayInterval);
    autoPlayInterval = window.setInterval(() => {
        if (!isGauntletActive || currentBoard.winner !== null) {
            if (autoPlayInterval) {
                clearInterval(autoPlayInterval);
                autoPlayInterval = null;
            }
            if (currentBoard.winner !== null) {
                handleMatchCompletion();
            }
            return;
        }
        stepMatch();
    }, simulationSpeedMs);
}
/**
 * Tiến hành 1 bước đi (Turn)
 */
async function stepMatch() {
    if (currentBoard.winner !== null)
        return;
    const currentTurn = currentBoard.turn;
    const opponent = gauntletQueue[currentQueueIndex];
    if (currentTurn === 'red') {
        // Lượt của Người chơi (Phe Đỏ)
        if (playerControlMode === 'builtin_bot') {
            const botMove = await executeBotMove({ ...opponent, code: 'botGold' }, currentBoard, 'red');
            makeBoardMove(botMove);
        }
        else if (playerControlMode === 'my_gist') {
            const botMove = await executeBotMove({ ...opponent, code: myGistBotCode || 'botGold' }, currentBoard, 'red');
            makeBoardMove(botMove);
        }
        else {
            // Chờ người chơi nhấp chọn trên bàn cờ, không làm gì ở tick tự động
        }
    }
    else {
        // Lượt của Đối thủ máy / người chơi khác (Phe Xanh)
        const botMove = await executeBotMove(opponent, currentBoard, 'blue');
        makeBoardMove(botMove);
    }
}
/**
 * Thực hiện nước đi trên bàn cờ
 */
function makeBoardMove(move) {
    const lastRecord = currentBoard.history[currentBoard.history.length - 1];
    currentBoard = applyMove(currentBoard, move);
    selectedPiece = null;
    highlightedMoves = [];
    renderBoard();
    updateMoveLogUI();
    if (currentBoard.winner !== null) {
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
        }
        handleMatchCompletion();
    }
}
/**
 * Xử lý khi trận đấu kết thúc (Thắng hoặc Thua)
 */
function handleMatchCompletion() {
    const opponent = gauntletQueue[currentQueueIndex];
    const isPlayerWinner = currentBoard.winner === 'red';
    if (isPlayerWinner) {
        defeatedOpponentsCount++;
        appendGameLog(`🎉 CHIẾN THẮNG! Bạn đã hạ gục ${opponent.name} (Hạng ${opponent.rank})!`, 'win');
        // Kiểm tra xem đã thắng toàn bộ tháp (hạ Rank 1) chưa
        const isDefeatedRank1 = opponent.rank === 1;
        if (isDefeatedRank1) {
            // 🏆 THẮNG RANK 1 -> TRỞ THÀNH TÂN VÔ ĐỊCH
            isGauntletActive = false;
            const appState = state;
            let userName = appState.currentUser?.login;
            if (!userName) {
                try {
                    userName = localStorage.getItem('cached_gh_username') || '';
                }
                catch (_) { }
            }
            userName = userName ? `@${userName}` : '@GitPlayer';
            const userAvatar = '👑';
            const { newRank } = finalizeGauntletRanking(userName, userAvatar, defeatedOpponentsCount, null, []);
            showResultModal('🏆 TÂN VÔ ĐỊCH OTTv2 TOÀN SERVER!', `Tuyệt đỉnh! Bạn đã đánh bại toàn bộ các đối thủ trên tháp và chính thức leo lên <strong>VỊ TRÍ HẠNG 1</strong>!`, newRank);
            renderLadderSidebar();
        }
        else {
            // Tiến lên đối thủ tiếp theo (rank cao hơn)
            currentQueueIndex++;
            appendGameLog(`⬆️ TIẾP TỤC LEO RANK: Chuẩn bị gặp đối thủ Hạng ${gauntletQueue[currentQueueIndex].rank}...`);
            setTimeout(() => {
                setupMatchAgainstCurrentOpponent();
            }, 1200);
        }
    }
    else {
        // 🛑 THUA TRẬN HOẶC HÒA -> DỪNG LẠI TẠI ĐÂY!
        isGauntletActive = false;
        appendGameLog(`🛑 THUA TRẬN! Bạn đã dừng bước trước ${opponent.name} (Hạng ${opponent.rank}).`, 'loss');
        const appState = state;
        let userName = appState.currentUser?.login;
        if (!userName) {
            try {
                userName = localStorage.getItem('cached_gh_username') || '';
            }
            catch (_) { }
        }
        userName = userName ? `@${userName}` : '@GitPlayer';
        const userAvatar = '👤';
        // Chèn người chơi vào vị trí ngay sau đối thủ vừa thua
        const { newRank } = finalizeGauntletRanking(userName, userAvatar, defeatedOpponentsCount, opponent, []);
        showResultModal('🛑 DỪNG CUỘC CHƠI (GAME OVER)', `Bạn đã dừng bước trước <strong>${opponent.name}</strong> (Hạng ${opponent.rank}).<br>Theo quy chế Thang Bậc Cambridge, thứ hạng mới của bạn được xếp ở vị trí <strong>HẠNG ${newRank}</strong> (ngay sau đối thủ vừa thua)!`, newRank);
        renderLadderSidebar();
    }
}
/**
 * Chạy mô phỏng tức thì cả trận đấu không cần chờ hoạt họa
 */
async function runFastSimulation() {
    if (!isGauntletActive || currentBoard.winner !== null)
        return;
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
    }
    const opponent = gauntletQueue[currentQueueIndex];
    let safetyLimit = 300;
    const playerCode = playerControlMode === 'my_gist' ? (myGistBotCode || 'botGold') : 'botGold';
    while (currentBoard.winner === null && safetyLimit-- > 0) {
        const color = currentBoard.turn;
        const botToRun = color === 'red' ? { ...opponent, code: playerCode } : opponent;
        const move = await executeBotMove(botToRun, currentBoard, color);
        currentBoard = applyMove(currentBoard, move);
    }
    renderBoard();
    updateMoveLogUI();
    handleMatchCompletion();
}
/**
 * Đầu hàng trận đấu
 */
function handleForfeit() {
    if (!isGauntletActive)
        return;
    if (!confirm('Bạn có chắc chắn muốn dừng lại và nhận kết quả thua trận này?'))
        return;
    currentBoard.winner = 'blue';
    currentBoard.winReason = 'Đầu hàng trận đấu.';
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
    }
    handleMatchCompletion();
}
/**
 * Hiển thị Modal Kết Quả Thứ Hạng Mới
 */
function showResultModal(title, desc, rank) {
    const modal = document.getElementById('gauntlet-result-modal');
    if (!modal)
        return;
    const titleEl = document.getElementById('gauntlet-result-title');
    const descEl = document.getElementById('gauntlet-result-desc');
    const rankEl = document.getElementById('gauntlet-result-rank');
    if (titleEl)
        titleEl.innerHTML = title;
    if (descEl)
        descEl.innerHTML = desc;
    if (rankEl)
        rankEl.textContent = `#${rank}`;
    modal.classList.remove('hidden');
}
window.closeGauntletResultModal = function () {
    const modal = document.getElementById('gauntlet-result-modal');
    if (modal)
        modal.classList.add('hidden');
};
/**
 * Cập nhật giao diện thanh trạng thái leo rank
 */
function updateGauntletHeaderUI() {
    const statusEl = document.getElementById('gauntlet-progress-status');
    if (!statusEl)
        return;
    if (!isGauntletActive) {
        statusEl.textContent = 'Chưa bắt đầu lượt leo rank';
        return;
    }
    const opponent = gauntletQueue[currentQueueIndex];
    statusEl.innerHTML = `Đang chiến đấu: <strong>Trận ${currentQueueIndex + 1}/${gauntletQueue.length}</strong> (Gặp Hạng ${opponent?.rank})`;
}
/**
 * Hiển thị thông tin đối thủ hiện tại
 */
function renderMatchInfo(opponent) {
    const nameEl = document.getElementById('match-opponent-name');
    const rankEl = document.getElementById('match-opponent-rank');
    const descEl = document.getElementById('match-opponent-desc');
    const avatarEl = document.getElementById('match-opponent-avatar');
    if (nameEl)
        nameEl.textContent = opponent.name;
    if (rankEl)
        rankEl.textContent = `Hạng ${opponent.rank} (${opponent.tier})`;
    if (descEl)
        descEl.textContent = opponent.description;
    if (avatarEl)
        avatarEl.textContent = opponent.avatar;
}
/**
 * Vẽ Bàn Cờ 9x9 (Hỗ trợ nhấp chọn di chuyển)
 */
export function renderBoard() {
    const boardEl = document.getElementById('ottv2-board');
    if (!boardEl)
        return;
    boardEl.innerHTML = '';
    // Vẽ từ hàng 8 xuống 0 (để row 8 = hàng 9 trên cùng, row 0 = hàng 1 dưới cùng)
    for (let r = BOARD_SIZE - 1; r >= 0; r--) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const cell = document.createElement('div');
            cell.className = 'board-cell';
            cell.dataset.col = c.toString();
            cell.dataset.row = r.toString();
            // Đánh dấu Căn cứ
            if (c === RED_BASE.col && r === RED_BASE.row) {
                cell.classList.add('base-cell', 'red-base');
                cell.title = 'Căn cứ Đỏ (a1)';
            }
            else if (c === BLUE_BASE.col && r === BLUE_BASE.row) {
                cell.classList.add('base-cell', 'blue-base');
                cell.title = 'Căn cứ Xanh (i9)';
            }
            // Ô cờ caro so le màu
            if ((r + c) % 2 === 1) {
                cell.classList.add('cell-alt');
            }
            const piece = currentBoard.grid[r][c];
            if (piece) {
                const pieceEl = document.createElement('div');
                pieceEl.className = `board-piece piece-${piece.color}`;
                pieceEl.innerHTML = `
          <span class="piece-icon">${getPieceEmoji(piece.type)}</span>
          <span class="piece-label">${getPieceNameVi(piece.type).split(' ')[0]}</span>
        `;
                pieceEl.title = `${piece.color === 'red' ? 'Phe Đỏ' : 'Phe Xanh'}: ${getPieceNameVi(piece.type)}`;
                if (selectedPiece && selectedPiece.id === piece.id) {
                    pieceEl.classList.add('selected');
                }
                cell.appendChild(pieceEl);
            }
            // Đánh dấu nước đi hợp lệ
            const moveOption = highlightedMoves.find(m => m.to.col === c && m.to.row === r);
            if (moveOption) {
                if (piece && piece.color !== currentBoard.turn) {
                    cell.classList.add('target-capture');
                }
                else {
                    cell.classList.add('target-move');
                }
            }
            // Xử lý sự kiện click
            cell.addEventListener('click', () => onCellClicked(c, r));
            boardEl.appendChild(cell);
        }
    }
    // Cập nhật lượt đi và số quân còn lại
    updateTurnStatusUI();
}
/**
 * Xử lý sự kiện nhấp vào 1 ô cờ
 */
function onCellClicked(col, row) {
    if (currentBoard.winner !== null || !isGauntletActive)
        return;
    // Nếu đang là lượt của máy (Xanh) hoặc đang không ở chế độ manual thì không cho nhấp can thiệp
    if (currentBoard.turn !== 'red' || playerControlMode !== 'manual')
        return;
    const clickedPiece = currentBoard.grid[row][col];
    // 1. Nếu bấm vào quân đồng minh của mình -> Chọn quân
    if (clickedPiece && clickedPiece.color === 'red') {
        selectedPiece = clickedPiece;
        highlightedMoves = getValidMovesForPiece(currentBoard, clickedPiece);
        renderBoard();
        return;
    }
    // 2. Nếu đã chọn quân và bấm vào một ô đích hợp lệ -> Đi quân!
    if (selectedPiece) {
        const chosenMove = highlightedMoves.find(m => m.to.col === col && m.to.row === row);
        if (chosenMove) {
            makeBoardMove(chosenMove);
            return;
        }
    }
    // Bấm ra ngoài ô hợp lệ -> Hủy chọn
    selectedPiece = null;
    highlightedMoves = [];
    renderBoard();
}
/**
 * Cập nhật thanh hiển thị lượt đi & tỉ số quân
 */
function updateTurnStatusUI() {
    const turnIndicator = document.getElementById('turn-indicator');
    const redCountEl = document.getElementById('red-pieces-count');
    const blueCountEl = document.getElementById('blue-pieces-count');
    const redCount = currentBoard.pieces.filter(p => p.color === 'red').length;
    const blueCount = currentBoard.pieces.filter(p => p.color === 'blue').length;
    if (redCountEl)
        redCountEl.textContent = redCount.toString();
    if (blueCountEl)
        blueCountEl.textContent = blueCount.toString();
    if (turnIndicator) {
        if (currentBoard.winner) {
            turnIndicator.innerHTML = `🏆 <strong>${currentBoard.winner === 'red' ? 'Phe Đỏ Thắng' : 'Phe Xanh Thắng'}</strong>: ${currentBoard.winReason}`;
        }
        else {
            turnIndicator.innerHTML = `Lượt ${currentBoard.turnCount}: <span class="badge-${currentBoard.turn}">${currentBoard.turn === 'red' ? '🔴 Phe Đỏ (Bạn)' : '🔵 Phe Xanh (Máy)'}</span>`;
        }
    }
}
/**
 * Vẽ Bảng Cột Mốc Thứ Hạng (Sidebar Ladder)
 */
export function renderLadderSidebar() {
    const ladderListEl = document.getElementById('gauntlet-ladder-list');
    if (!ladderListEl)
        return;
    const { ladder, userRank } = getGauntletState();
    ladderListEl.innerHTML = '';
    ladder.forEach((bot) => {
        const li = document.createElement('li');
        li.className = 'ladder-item';
        // Xác định trạng thái của bot này trong trận leo rank
        const isCurrentTarget = isGauntletActive && gauntletQueue[currentQueueIndex]?.id === bot.id;
        const isDefeated = isGauntletActive && gauntletQueue.slice(0, currentQueueIndex).some(b => b.id === bot.id);
        const isUserEarned = userRank === bot.rank;
        if (isCurrentTarget)
            li.classList.add('active-target');
        if (isDefeated)
            li.classList.add('defeated-target');
        if (isUserEarned)
            li.classList.add('user-rank-spot');
        // Đảm bảo tên hiển thị chuẩn Git (@username), không in URL ảnh
        let displayName = (bot.name || '').trim();
        if (!displayName || displayName.includes('http') || displayName.includes('avatars.githubusercontent.com')) {
            let cached = '';
            try {
                cached = localStorage.getItem('cached_gh_username') || '';
            }
            catch (_) { }
            displayName = cached ? `@${cached}` : '@GitPlayer';
        }
        else if (!displayName.startsWith('@') && !displayName.includes('_') && !displayName.includes(' ')) {
            displayName = `@${displayName}`;
        }
        // Avatar hiển thị an toàn: nếu là icon emoji thì giữ, nếu là URL thì hiển thị ảnh nhỏ 24px hoặc icon 👤
        const avatarContent = bot.avatar && bot.avatar.startsWith('http')
            ? `<img src="${bot.avatar}" class="ladder-avatar-img" alt="${displayName}" />`
            : (bot.avatar || '👤');
        li.innerHTML = `
      <div class="ladder-rank-badge ${bot.rank === 1 ? 'rank-1' : bot.rank <= 3 ? 'rank-top3' : ''}">#${bot.rank}</div>
      <div class="ladder-bot-avatar">${avatarContent}</div>
      <div class="ladder-bot-details">
        <div class="ladder-bot-name">
          ${displayName}
          ${isUserEarned ? '<span class="tag-you">⭐ Bạn Đang Ở Đây</span>' : ''}
        </div>
        <div class="ladder-bot-meta">${bot.title} • ${bot.tier}</div>
      </div>
      <div class="ladder-bot-status">
        ${isCurrentTarget ? '⚔️ Đang đấu' : isDefeated ? '✅ Đã thắng' : isUserEarned ? '📍 Hạng của bạn' : '🔒 Thách đấu'}
      </div>
    `;
        ladderListEl.appendChild(li);
    });
}
/**
 * Cập nhật nhật ký nước đi
 */
function updateMoveLogUI() {
    const logEl = document.getElementById('ottv2-move-history');
    if (!logEl)
        return;
    logEl.innerHTML = '';
    currentBoard.history.slice(-15).forEach((record, idx) => {
        const item = document.createElement('div');
        item.className = `log-entry log-${record.color}`;
        item.textContent = `${record.color === 'red' ? '🔴' : '🔵'} ${record.notation}`;
        logEl.appendChild(item);
    });
    logEl.scrollTop = logEl.scrollHeight;
}
function appendGameLog(msg, type = 'info') {
    const logEl = document.getElementById('ottv2-move-history');
    if (!logEl)
        return;
    const item = document.createElement('div');
    item.className = `log-entry log-system log-${type}`;
    item.innerHTML = msg;
    logEl.appendChild(item);
    logEl.scrollTop = logEl.scrollHeight;
}
//# sourceMappingURL=arenaUI.js.map