export function initTabs(): void {
  const navTabs = document.querySelectorAll<HTMLElement>('.nav-tab');
  const tabContents = document.querySelectorAll<HTMLElement>('.tab-content');

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.tab;
      navTabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      if (targetId) {
        const targetContent = document.getElementById(targetId);
        if (targetContent) {
          targetContent.classList.add('active');
        }
      }
    });
  });
}

export function switchTab(tabId: string): void {
  const tabButton = document.querySelector<HTMLElement>(`[data-tab="${tabId}"]`);
  if (tabButton) {
    tabButton.click();
  }
}
