import { GitHubUser, GitHubGist } from '../types/index.js';
declare class AppState {
    currentUser: GitHubUser | null;
    communityUsers: string[];
    allCommunityGists: GitHubGist[];
    selectedUserFilter: string;
    currentModalCode: string;
    currentModalGistId: string;
    constructor();
    loadLocalCommunityUsers(): string[];
    saveLocalCommunityUsers(): void;
    addCommunityUser(username: string): boolean;
    mergeCommunityUsers(newUsers: string[]): boolean;
}
export declare const state: AppState;
export {};
