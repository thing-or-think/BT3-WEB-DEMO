import { GitHubUser, GitHubGist } from '../types/index.js';
export declare function checkAuthSession(): Promise<void>;
export declare function renderAuthenticatedUI(user: GitHubUser, gists?: GitHubGist[]): void;
export declare function renderUnauthenticatedUI(): void;
export declare function initAuthModule(): void;
