import { detectLanguage } from '../utils/lang.js';
export { detectLanguage };
export declare function registerUserToCommunity(username: string): void;
export declare function initPlayHTMLCommunitySync(): void;
export declare function renderMemberChips(): void;
export declare function loadAllCommunityGists(): Promise<void>;
export declare function renderCommunityGistsList(): void;
export declare function initFeedModule(): void;
export declare function postGistToCommunityFeed(title: string, gistId: string, filename: string): Promise<void>;
