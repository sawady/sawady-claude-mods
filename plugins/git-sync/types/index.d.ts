export type Sync = {
  /** Repo root, absolute. */
  root: string
  branch: string
  /** Upstream ref, e.g. origin/main; null when the branch tracks none. */
  upstream: string | null
  /** Commits on HEAD not on the upstream: to push. */
  ahead: number
  /** Commits on the upstream not on HEAD: to pull. */
  behind: number
  /** When the last successful fetch finished (ms epoch); null if never. */
  fetchedAt: number | null
  /** Why the last fetch failed, if it did. */
  fetchError: string | null
}

declare module 'claude-code' {
  interface PluginState {
    'git-sync': { sync: Sync | null; isFetching: boolean }
  }
}
