import { fetchUserGists, fetchGistDetail } from './github.js';
export const DEFAULT_CONTEST_TAG = '#ottv2_contest_2026_s1';
const CONTEST_TAG_KEY = 'ottv2_active_contest_tag';
// Bộ nhớ đệm tạm thời cho code Gist của người chơi để tránh gọi API lặp lại
const botCodeCache = new Map();
/**
 * Lấy Tag cuộc thi hiện tại (kèm hash mùa giải/thời gian thi)
 */
export function getActiveContestTag() {
    try {
        const saved = localStorage.getItem(CONTEST_TAG_KEY);
        if (saved && saved.trim())
            return saved.trim();
    }
    catch (_) { }
    return DEFAULT_CONTEST_TAG;
}
/**
 * Cập nhật Tag cuộc thi mới
 */
export function setActiveContestTag(tag) {
    try {
        localStorage.setItem(CONTEST_TAG_KEY, tag.trim());
    }
    catch (_) { }
}
/**
 * Tìm và lấy Gist nộp code LẦN CUỐI CÙNG của một người chơi có chứa Tag cuộc thi
 *
 * @param username Tên GitHub của người chơi (có thể có hoặc không có '@')
 * @param contestTag Hash tag cuộc thi (ví dụ: #ottv2_contest_2026_s1)
 */
export async function fetchPlayerLatestContestGist(username, contestTag = getActiveContestTag()) {
    const cleanUsername = username.replace(/^@/, '').trim();
    if (!cleanUsername)
        return null;
    try {
        // 1. Lấy danh sách Gist công khai của người chơi
        const gists = await fetchUserGists(cleanUsername, 30);
        if (!gists || gists.length === 0)
            return null;
        const normalizedTag = contestTag.toLowerCase().trim();
        // 2. Lọc các Gist có mô tả chứa Tag cuộc thi
        const contestGists = gists.filter(g => {
            const desc = (g.description || '').toLowerCase();
            // Kiểm tra xem mô tả có chứa tag cuộc thi không
            return desc.includes(normalizedTag) || desc.includes('#ottv2');
        });
        if (contestGists.length === 0)
            return null;
        // 3. Sắp xếp theo thời gian nộp/cập nhật giảm dần để LẤY BẢN NỘP CUỐI CÙNG
        contestGists.sort((a, b) => {
            const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
            const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
            return dateB - dateA;
        });
        const latestGist = contestGists[0];
        const gistId = latestGist.id;
        const updatedAt = latestGist.updated_at || latestGist.created_at || new Date().toISOString();
        // Kiểm tra cache trước
        const cached = botCodeCache.get(gistId);
        if (cached && cached.updatedAt === updatedAt) {
            return {
                code: cached.code,
                gistId,
                gistUrl: latestGist.html_url,
                updatedAt,
                description: latestGist.description || '',
                filename: 'ottv2_bot.js',
            };
        }
        // 4. Lấy chi tiết nội dung code từ Gist
        const fullDetail = await fetchGistDetail(gistId);
        const files = fullDetail.files || latestGist.files || {};
        const fileKeys = Object.keys(files);
        if (fileKeys.length === 0)
            return null;
        // Ưu tiên file tên ottv2_bot.js, bot.js, hoặc file .js đầu tiên
        let chosenKey = fileKeys.find(k => k.toLowerCase() === 'ottv2_bot.js' || k.toLowerCase() === 'bot.js');
        if (!chosenKey) {
            chosenKey = fileKeys.find(k => k.toLowerCase().endsWith('.js'));
        }
        if (!chosenKey) {
            chosenKey = fileKeys[0]; // fallback lấy file đầu tiên
        }
        const chosenFile = files[chosenKey];
        let codeContent = chosenFile.content || '';
        // Nếu API chưa trả nội dung trực tiếp thì tải từ raw_url
        if (!codeContent && chosenFile.raw_url) {
            const rawRes = await fetch(chosenFile.raw_url);
            if (rawRes.ok) {
                codeContent = await rawRes.text();
            }
        }
        if (!codeContent)
            return null;
        // Lưu vào cache
        botCodeCache.set(gistId, { code: codeContent, updatedAt });
        return {
            code: codeContent,
            gistId,
            gistUrl: latestGist.html_url,
            updatedAt,
            description: latestGist.description || '',
            filename: chosenKey,
        };
    }
    catch (err) {
        console.warn(`Lỗi khi tìm Gist cuộc thi của @${cleanUsername}:`, err);
        return null;
    }
}
/**
 * Quét toàn bộ danh bạ thành viên cộng đồng để tìm những người chơi đã nộp Bot
 */
export async function scanCommunityPlayersWithContestGists(usernames, contestTag = getActiveContestTag()) {
    const playerBots = [];
    const uniqueUsers = [...new Set(usernames.map(u => u.replace(/^@/, '').trim()).filter(Boolean))];
    for (const user of uniqueUsers) {
        try {
            const submission = await fetchPlayerLatestContestGist(user, contestTag);
            if (submission) {
                playerBots.push({
                    id: `player_${user}`,
                    name: `@${user}`,
                    avatar: '👤',
                    rank: 999, // sẽ được sắp xếp lại
                    tier: 'Diamond',
                    title: 'Chiến Binh Cộng Đồng',
                    author: user,
                    description: `Gist mới nhất: ${submission.description.slice(0, 45)} (Cập nhật: ${new Date(submission.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
                    code: submission.code,
                    gistId: submission.gistId,
                    gistUrl: submission.gistUrl,
                    isHumanPlayer: true,
                    contestTag,
                    lastSubmittedAt: submission.updatedAt,
                });
            }
        }
        catch (_) { }
    }
    return playerBots;
}
//# sourceMappingURL=contestGist.js.map