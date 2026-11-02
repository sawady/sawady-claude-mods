export type Lang = 'en' | 'es'

export type Strings = {
  toPush: (n: number) => string
  toPull: (n: number) => string
  noUpstream: string
  fetching: string
  fetchFailed: (why: string) => string
  fetchedAgo: (ms: number) => string
  notFetched: string
  newToPull: (n: number, upstream: string) => string
}

function minutes(ms: number) {
  return Math.floor(ms / 60_000)
}

export const STRINGS: Record<Lang, Strings> = {
  en: {
    toPush: n => `↑${n} to push`,
    toPull: n => `↓${n} to pull`,
    noUpstream: 'no upstream: nothing published on the remote',
    fetching: '(fetching…)',
    fetchFailed: why => `(fetch failed: ${why})`,
    fetchedAgo: ms => {
      const min = minutes(ms)
      if (min < 1) return '(fetched just now)'
      if (min < 60) return `(fetched ${min} min ago)`
      return `(fetched ${Math.floor(min / 60)} h ago)`
    },
    notFetched: '(not fetched yet)',
    newToPull: (n, upstream) => `git-sync: ${n} new commit${n > 1 ? 's' : ''} to pull from ${upstream}`,
  },
  es: {
    toPush: n => `↑${n} para subir`,
    toPull: n => `↓${n} para bajar`,
    noUpstream: 'sin upstream: nada publicado en el remoto',
    fetching: '(fetch…)',
    fetchFailed: why => `(fetch falló: ${why})`,
    fetchedAgo: ms => {
      const min = minutes(ms)
      if (min < 1) return '(fetch recién)'
      if (min < 60) return `(fetch hace ${min} min)`
      return `(fetch hace ${Math.floor(min / 60)} h)`
    },
    notFetched: '(sin fetch)',
    newToPull: (n, upstream) => `git-sync: ${n} commit${n > 1 ? 's' : ''} para bajar de ${upstream}`,
  },
}

/** Picks a language from a POSIX locale such as `es_AR.UTF-8`; English otherwise. */
export function langFromLocale(locale: string | undefined): Lang {
  return locale?.toLowerCase().startsWith('es') ? 'es' : 'en'
}
