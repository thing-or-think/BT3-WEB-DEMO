export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name?: string | null;
  bio?: string | null;
  public_repos?: number;
  public_gists?: number;
  followers?: number;
  following?: number;
}

export interface GitHubGistFile {
  filename: string;
  type?: string;
  language?: string;
  raw_url?: string;
  size?: number;
  content?: string;
}

export interface GitHubGist {
  id: string;
  description: string | null;
  public: boolean;
  created_at?: string;
  updated_at: string;
  html_url: string;
  files: Record<string, GitHubGistFile>;
  owner?: GitHubUser;
  author_login?: string;
}

export interface PlayHTMLChannel<T> {
  getData: () => T;
  setData: (data: T | ((draft: T) => void)) => void;
  onUpdate: (callback: (data: T) => void) => () => void;
  destroy?: () => void;
}

export interface PlayHTMLInstance {
  init: (options?: { room?: string | (() => string); host?: string }) => Promise<unknown>;
  setupPlayElements?: () => void;
  createPageData?: <T>(name: string, defaultVal: T) => PlayHTMLChannel<T>;
  roomId?: string;
  host?: string;
  ready?: Promise<unknown>;
  isLoading?: boolean;
}

declare global {
  interface Window {
    playhtml?: PlayHTMLInstance;
    openCodePreview?: (title: string, code: string, gistId?: string) => void;
    closeCodeModal?: () => void;
    copyModalCode?: () => void;
    forkCurrentModalCode?: () => void;
    fetchAndOpenGist?: (gistId: string) => Promise<void>;
    postGistToCommunityFeed?: (title: string, gistId: string, filename: string) => Promise<void>;
    copySnippetCode?: (code: string) => void;
    copySnippetLink?: (url: string) => void;
    forkGist?: (gistId: string) => Promise<void>;
    toggleQuickShare?: (show: boolean) => void;
    initPlayHTMLCommunitySync?: () => void;
    showError?: (msg: string) => void;
    showSuccess?: (msg: string) => void;
  }
}
