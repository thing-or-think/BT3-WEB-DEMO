import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';

app.use(express.json());
app.use(cookieParser());
app.use(express.static(__dirname, { dotfiles: 'ignore' }));

// Thời hạn lưu Cookie: 30 ngày (tính bằng mili-giây)
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

/**
 * 1. Endpoint khởi tạo đăng nhập GitHub OAuth
 */
app.get('/api/auth/github', (req, res) => {
  if (!GITHUB_CLIENT_ID) {
    return res.status(400).json({
      error: 'Chưa cấu hình GITHUB_CLIENT_ID trong file .env!',
      hint: 'Bạn có thể dùng tính năng [Đăng nhập bằng Personal Access Token] bên dưới để test ngay lập tức.'
    });
  }

  const redirectUri = `http://localhost:${PORT}/api/auth/callback`;
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=gist,repo,read:user&redirect_uri=${encodeURIComponent(redirectUri)}`;
  res.redirect(githubAuthUrl);
});

/**
 * 2. Callback nhận Authorization Code từ GitHub và đổi lấy Access Token
 */
app.get('/api/auth/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect('/?error=Khong_nhan_duoc_code_tu_github');
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      return res.redirect(`/?error=${encodeURIComponent(tokenData.error_description || 'Lỗi cấp mã token')}`);
    }

    // LƯU TOKEN VÀO COOKIE VỚI HẠN DÙNG 30 NGÀY
    res.cookie('gh_token', tokenData.access_token, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true, // Bảo vệ chống mã độc XSS đánh cắp token
      sameSite: 'lax',
      path: '/'
    });

    // Tạo cookie phụ hiển thị trạng thái cho Client UI
    res.cookie('gh_auth_status', 'logged_in', {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: false,
      sameSite: 'lax',
      path: '/'
    });

    res.redirect('/');
  } catch (err) {
    console.error('Lỗi khi đổi token:', err);
    res.redirect('/?error=Loi_ket_noi_github');
  }
});

/**
 * 3. Phương thức đăng nhập dự phòng: Dán Personal Access Token (PAT)
 * Lưu trực tiếp vào Cookie 30 ngày để test ngay mà không cần tạo OAuth App
 */
app.post('/api/auth/token', async (req, res) => {
  const { token } = req.body;

  if (!token || !token.trim()) {
    return res.status(400).json({ error: 'Vui lòng nhập Token hợp lệ!' });
  }

  try {
    // Xác thực token với GitHub API
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'User-Agent': 'Git-Auth-Cookie-Demo'
      }
    });

    if (!userRes.ok) {
      return res.status(401).json({ error: 'Token GitHub không hợp lệ hoặc đã hết hạn!' });
    }

    const userData = await userRes.json();

    // Lưu Token vào Cookie 30 ngày
    res.cookie('gh_token', token.trim(), {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite: 'lax',
      path: '/'
    });

    res.cookie('gh_auth_status', 'logged_in', {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: false,
      sameSite: 'lax',
      path: '/'
    });

    return res.json({
      success: true,
      message: 'Đăng nhập thành công và đã lưu Cookie 30 ngày!',
      user: userData
    });
  } catch (err) {
    console.error('Lỗi kiểm tra token:', err);
    return res.status(500).json({ error: 'Lỗi máy chủ khi kết nối với GitHub API' });
  }
});

/**
 * 4. Endpoint kiểm tra phiên đăng nhập hiện tại từ Cookie
 * Mỗi lần mở lại trang hoặc F5, web sẽ gọi API này
 */
app.get('/api/me', async (req, res) => {
  const token = req.cookies.gh_token;

  if (!token) {
    return res.json({ authenticated: false, message: 'Chưa có Cookie đăng nhập hoặc Cookie đã hết hạn' });
  }

  try {
    // Lấy thông tin User profile từ GitHub
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Git-Auth-Cookie-Demo'
      }
    });

    if (!userRes.ok) {
      // Nếu token trong cookie đã bị thu hồi trên GitHub
      res.clearCookie('gh_token');
      res.clearCookie('gh_auth_status');
      return res.json({ authenticated: false, message: 'Token trong Cookie không còn hợp lệ trên GitHub' });
    }

    const userData = await userRes.json();

    // Lấy thêm 5 gists gần nhất để minh họa "Git as Database"
    let gists = [];
    try {
      const gistsRes = await fetch('https://api.github.com/gists?per_page=5', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Git-Auth-Cookie-Demo'
        }
      });
      if (gistsRes.ok) {
        gists = await gistsRes.json();
      }
    } catch (_) {}

    return res.json({
      authenticated: true,
      user: userData,
      gists,
      cookieInfo: {
        cookieName: 'gh_token',
        status: 'Active (Đang hoạt động)',
        duration: '30 ngày (Persistent Cookie)',
        type: 'HttpOnly Secure Token'
      }
    });
  } catch (err) {
    console.error('Lỗi đọc phiên:', err);
    return res.status(500).json({ authenticated: false, error: 'Không thể kết nối đến GitHub' });
  }
});

/**
 * 5. Lưu code snippet thử nghiệm vào GitHub Gist của User (Git as DB)
 */
app.post('/api/gists/save', async (req, res) => {
  const token = req.cookies.gh_token;
  if (!token) {
    return res.status(401).json({ error: 'Bạn chưa đăng nhập!' });
  }

  const { title, filename, code } = req.body;
  if (!filename || !code) {
    return res.status(400).json({ error: 'Tên file và nội dung code không được để trống!' });
  }

  try {
    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Git-Auth-Cookie-Demo'
      },
      body: JSON.stringify({
        description: title || 'Snippet được lưu từ Web Demo',
        public: true,
        files: {
          [filename]: { content: code }
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Lỗi khi lưu Gist' });
    }

    return res.json({
      success: true,
      message: 'Code đã được lưu trực tiếp vào GitHub của bạn!',
      gistUrl: data.html_url,
      gistId: data.id
    });
  } catch (err) {
    console.error('Lỗi lưu Gist:', err);
    return res.status(500).json({ error: 'Lỗi server khi gọi GitHub Gist API' });
  }
});

/**
 * 6. Đăng xuất: Xóa Cookie khỏi trình duyệt
 */
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('gh_token', { path: '/' });
  res.clearCookie('gh_auth_status', { path: '/' });
  return res.json({ success: true, message: 'Đã xóa Cookie và đăng xuất thành công!' });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Web Demo đang chạy tại: http://localhost:${PORT}`);
  console.log(`🔑 GitHub OAuth App: ${GITHUB_CLIENT_ID ? 'ĐÃ CẤU HÌNH' : 'CHƯA CẤU HÌNH (Dùng PAT login)'}`);
  console.log(`🍪 Cơ chế Cookie: Tự động ghi nhớ phiên trong 30 ngày`);
  console.log(`====================================================`);
});
