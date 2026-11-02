import { expect, test } from 'claude-code/testing'

import { STRINGS, langFromLocale } from '../hooks/i18n'

test('auto picks Spanish only from a Spanish locale', async () => {
  expect(langFromLocale('es_AR.UTF-8')).toBe('es')
  expect(langFromLocale('es')).toBe('es')
  expect(langFromLocale('en_US.UTF-8')).toBe('en')
  expect(langFromLocale('C.UTF-8')).toBe('en')
  expect(langFromLocale(undefined)).toBe('en')
})

test('both languages word the band', async () => {
  expect(STRINGS.en.toPush(2)).toBe('↑2 to push')
  expect(STRINGS.es.toPull(3)).toBe('↓3 para bajar')
  expect(STRINGS.en.fetchedAgo(5 * 60_000)).toBe('(fetched 5 min ago)')
  expect(STRINGS.es.fetchedAgo(10_000)).toBe('(fetch recién)')
  expect(STRINGS.en.newToPull(1, 'origin/main')).toBe('git-sync: 1 new commit to pull from origin/main')
})
