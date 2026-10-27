import { PlayHTMLInstance, PlayHTMLChannel, GitHubGist } from '../types/index.js';
import { BotProfile } from '../types/ottv2.js';
export declare function initPlayHTMLService(onReadyCallback?: (instance: PlayHTMLInstance) => void | Promise<void>): Promise<void>;
export declare function createCommunityChannel(initialUsers?: string[], onUpdateCallback?: (newList: string[]) => void): PlayHTMLChannel<string[]> | null;
export declare function syncCommunityUsersList(usersList: string[]): void;
export declare function createSnippetsChannel(onUpdateCallback?: (newSnippets: GitHubGist[]) => void): PlayHTMLChannel<GitHubGist[]> | null;
export declare function getSharedSnippets(): GitHubGist[];
export declare function broadcastSnippet(snippet: GitHubGist): void;
export declare function broadcastMultipleSnippets(snippetsList: GitHubGist[]): void;
export declare function reinitPlayHTMLElements(): void;
/**
 * Tạo kênh Realtime cho Bảng Xếp Hạng Thang Bậc OTTv2 (PartyKit / Yjs CRDT)
 */
export declare function createOttv2LadderChannel(onUpdateCallback?: (newLadder: BotProfile[]) => void): PlayHTMLChannel<BotProfile[]> | null;
export declare function getSharedOttv2Ladder(): BotProfile[];
export declare function broadcastOttv2Ladder(newLadder: BotProfile[]): void;
