import { GitHubUser, GitHubGist } from '../types/index.js';
export declare function fetchUserProfile(token?: string | null): Promise<GitHubUser>;
export declare function fetchTargetUserProfile(username: string): Promise<GitHubUser>;
export declare function fetchUserGists(username: string, perPage?: number): Promise<GitHubGist[]>;
export declare function fetchMyGists(token?: string | null, perPage?: number): Promise<GitHubGist[]>;
export declare function fetchGistDetail(gistId: string): Promise<GitHubGist>;
export interface CreateGistParams {
    title: string;
    filename: string;
    code: string;
    isPublic?: boolean;
}
export declare function createGist({ title, filename, code, isPublic }: CreateGistParams, token?: string | null): Promise<GitHubGist>;
export declare function forkGist(gistId: string, token?: string | null): Promise<GitHubGist>;
