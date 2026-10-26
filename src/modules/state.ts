import { CONFIG } from '../config.js';
import { GitHubUser, GitHubGist } from '../types/index.js';

class AppState {
  currentUser: GitHubUser | null;
  communityUsers: string[];
  allCommunityGists: GitHubGist[];
  selectedUserFilter: string;
  currentModalCode: string;
  currentModalGistId: string;

  constructor() {
    this.currentUser = null;
    this.communityUsers = this.loadLocalCommunityUsers();
    this.allCommunityGists = [];
    this.selectedUserFilter = 'all';
    this.currentModalCode = '';
    this.currentModalGistId = '';
  }

  loadLocalCommunityUsers(): string[] {
    try {
      const savedRaw = localStorage.getItem(CONFIG.LOCAL_USERS_STORAGE_KEY);
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        if (Array.isArray(saved) && saved.length > 0) {
          return [...new Set([...CONFIG.DEFAULT_COMMUNITY_USERS, ...saved])];
        }
      }
    } catch (_) {}
    return [...CONFIG.DEFAULT_COMMUNITY_USERS];
  }

  saveLocalCommunityUsers(): void {
    try {
      localStorage.setItem(CONFIG.LOCAL_USERS_STORAGE_KEY, JSON.stringify(this.communityUsers));
    } catch (_) {}
  }

  addCommunityUser(username: string): boolean {
    if (!username) return false;
    username = username.trim().toLowerCase();
    if (!this.communityUsers.includes(username)) {
      this.communityUsers.push(username);
      this.saveLocalCommunityUsers();
      return true;
    }
    return false;
  }

  mergeCommunityUsers(newUsers: string[]): boolean {
    if (!Array.isArray(newUsers) || newUsers.length === 0) return false;
    const cleanUsers = newUsers.map(u => String(u).trim().toLowerCase()).filter(Boolean);
    const beforeCount = this.communityUsers.length;
    this.communityUsers = [...new Set([...this.communityUsers, ...cleanUsers])];
    this.saveLocalCommunityUsers();
    return this.communityUsers.length > beforeCount;
  }
}

export const state = new AppState();
