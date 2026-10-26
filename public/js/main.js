import { initTabs } from './modules/tabs.js';
import { initAuthModule, checkAuthSession } from './modules/auth.js';
import { initEditorModule } from './modules/editor.js';
import { initFeedModule, initPlayHTMLCommunitySync, postGistToCommunityFeed } from './modules/feed.js';
import { initSearchModule, fetchAndOpenGist } from './modules/search.js';
import { initModal, openCodePreview, closeCodeModal, copyModalCode, forkCurrentModalCode } from './modules/modal.js';
import { initPlayHTMLService } from './services/playhtml.js';
import { copyToClipboard, showError, showSuccess } from './utils/dom.js';
import { forkGist } from './services/github.js';
import { getCookie } from './utils/cookie.js';

// Gán các hàm toàn cục để phục vụ các sự kiện inline HTML (onclick=...)
window.openCodePreview = openCodePreview;
window.closeCodeModal = closeCodeModal;
window.copyModalCode = copyModalCode;
window.forkCurrentModalCode = forkCurrentModalCode;
window.fetchAndOpenGist = fetchAndOpenGist;
window.postGistToCommunityFeed = postGistToCommunityFeed;
window.initPlayHTMLCommunitySync = initPlayHTMLCommunitySync;
window.showError = showError;
window.showSuccess = showSuccess;

window.copySnippetCode = function(code) {
  copyToClipboard(code, 'Đã sao chép đoạn code vào bộ nhớ tạm!');
};

window.copySnippetLink = function(url) {
  copyToClipboard(url, 'Đã sao chép link Gist vào bộ nhớ tạm!');
};

window.forkGist = async function(gistId) {
  const token = getCookie();
  if (!token) {
    showError('Bạn cần đăng nhập để Fork code về tài khoản cá nhân!');
    return;
  }

  if (!confirm('Bạn có muốn sao chép (Fork) đoạn code này về tài khoản GitHub của bạn?')) return;

  try {
    const data = await forkGist(gistId, token);
    showSuccess(`🎉 Fork thành công! Mã đã được lưu vào tài khoản của bạn: ${data.html_url}`);
    setTimeout(() => window.location.reload(), 1500);
  } catch (err) {
    showError(err.message || 'Fork thất bại.');
  }
};

// Khởi chạy ứng dụng khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Khởi động ứng dụng Git-as-a-DB Web Demo (Modular Architecture)...');

  // 1. Quản lý Tabs
  initTabs();

  // 2. Quản lý Modal
  initModal();

  // 3. Quản lý Đăng nhập & Xác thực
  initAuthModule();

  // 4. Quản lý Soạn thảo & Tạo Gist
  initEditorModule();

  // 5. Quản lý Feed danh sách cộng đồng
  initFeedModule();

  // 6. Quản lý Tìm kiếm Gist người dùng
  initSearchModule();

  // 7. Kiểm tra phiên đăng nhập (Cookie 30 ngày)
  await checkAuthSession();

  // 8. Khởi tạo PlayHTML Realtime Sync
  await initPlayHTMLService(() => {
    initPlayHTMLCommunitySync();
  });
});
