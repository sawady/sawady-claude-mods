import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Sync } from '../types'
import { STRINGS, langFromLocale } from './i18n'
import type { Lang } from './i18n'

const sync = atom({ plugin: 'git-sync', key: 'sync' } as const, null)
const isFetching = atom({ plugin: 'git-sync', key: 'isFetching' } as const, false)

const FETCH_EVERY_MS = 3 * 60 * 1000
// Never wait on a credentials prompt nobody can answer.
const GIT_ENV = { GIT_TERMINAL_PROMPT: '0' }

async function git($: EngineInterface, cwd: string, args: string[], timeoutMs = 10_000) {
  try {
    const r = await $.process.run(['git', '-C', cwd, ...args], { env: GIT_ENV, timeoutMs })
    return { ok: r.exitCode === 0, code: r.exitCode, out: r.stdout.trim(), err: r.stderr.trim() }
  } catch (err) {
    return { ok: false, code: -1, out: '', err: String(err) }
  }
}

let running: Promise<void> | null = null
let lang: Lang = 'en'

// `auto` follows the locale the session runs under (LC_ALL, LC_MESSAGES, LANG).
async function resolveLang($: EngineInterface, setting: string) {
  if (setting === 'en' || setting === 'es') return setting
  const locale =
    (await $.env.get('LC_ALL')) || (await $.env.get('LC_MESSAGES')) || (await $.env.get('LANG'))
  return langFromLocale(locale)
}

// Reads branch/upstream and counts commits each way; with `fetch`, updates
// the remote-tracking refs first so "to pull" reflects the real remote.
async function refresh($: EngineInterface, fetch: boolean) {
  if (running) return running
  running = (async () => {
    const cwd = await $.session.cwd()
    const top = await git($, cwd, ['rev-parse', '--show-toplevel'])
    if (!top.ok) {
      await update($, sync, () => null)
      return
    }
    const root = top.out
    const branch = (await git($, root, ['rev-parse', '--abbrev-ref', 'HEAD'])).out
    const up = await git($, root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'])
    const upstream = up.ok ? up.out : null
    const prev = await read($, sync)
    const isSameBranch = prev?.root === root && prev.branch === branch

    let fetchedAt = isSameBranch ? prev.fetchedAt : null
    let fetchError = isSameBranch ? prev.fetchError : null
    if (fetch && upstream) {
      await update($, isFetching, () => true)
      const f = await git($, root, ['fetch', '--quiet', '--no-tags'], 30_000)
      await update($, isFetching, () => false)
      if (f.ok) {
        fetchedAt = await $.clock.now()
        fetchError = null
      } else {
        fetchError = f.err.split('\n').pop() || `git exit ${f.code}`
      }
    }

    let ahead = 0
    let behind = 0
    if (upstream) {
      const c = await git($, root, ['rev-list', '--left-right', '--count', 'HEAD...@{u}'])
      if (c.ok) {
        const [a = 0, b = 0] = c.out.split(/\s+/).map(Number)
        ahead = a
        behind = b
      }
    }

    if (behind > 0 && behind > (isSameBranch ? prev.behind : 0)) {
      $.ui.toast(STRINGS[lang].newToPull(behind, upstream ?? ''))
    }

    const next: Sync = { root, branch, upstream, ahead, behind, fetchedAt, fetchError }
    await update($, sync, () => next)
  })().finally(() => {
    running = null
  })
  return running
}

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    lang = await resolveLang($, String(options.language ?? 'auto'))
    void refresh($, true)
    $.clock.every(FETCH_EVERY_MS, () => void refresh($, true))
    return started
  })

  // A commit, checkout or cd during the turn changes the counts: recount locally.
  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    void refresh($, false)
    return done
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const s = await read($, sync)
    if (e.props.hasSurvey || s === null) return next(e)

    const hasNoUpstream = s.upstream === null
    if (!hasNoUpstream && s.ahead === 0 && s.behind === 0) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const fetching = await read($, isFetching)
    const now = await $.clock.now()
    const t = STRINGS[lang]

    return (
      <Box flexDirection="row" gap={1}>
        <Text color="magenta">⇅ {s.branch}</Text>
        {hasNoUpstream ? (
          <Text color="yellow">{t.noUpstream}</Text>
        ) : (
          <>
            <Text dimColor>→ {s.upstream}</Text>
            {s.ahead > 0 && <Text color="green">{t.toPush(s.ahead)}</Text>}
            {s.behind > 0 && <Text color="yellow">{t.toPull(s.behind)}</Text>}
            <Text dimColor>
              {fetching
                ? t.fetching
                : s.fetchError
                  ? t.fetchFailed(s.fetchError)
                  : s.fetchedAt
                    ? t.fetchedAgo(now - s.fetchedAt)
                    : t.notFetched}
            </Text>
            <Button key="fetch" label="fetch" plain onPress={() => void refresh($, true)} />
          </>
        )}
      </Box>
    )
  })
}
