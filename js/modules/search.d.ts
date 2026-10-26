import { GitHubUser, GitHubGist } from '../types/index.js';
export declare function fetchAndOpenGist(gistId: string): Promise<void>;
export declare function renderTargetUserResults(user: GitHubUser, gists: GitHubGist[]): void;
export declare function initSearchModule(): void;
