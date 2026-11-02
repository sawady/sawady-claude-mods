# sawady-claude-mods

Mods and tweaks for [Claude Code](https://claude.com/claude-code) that keep the things I always want to see in view while I work.

| | What it is | What it does |
|---|---|---|
| [`git-sync`](#git-sync) | Claude Code mod (plugin) | Shows above the prompt whether the session's git repo has commits to push or pull, fetching in the background. |
| [`statusline`](#statusline) | Status line script | One line with folder, git, context usage, model and effort, usage limits, RAM, CPU and Docker. |

Both speak English and Spanish: by default they follow your locale (`LANG`), and you can pin either one.

## git-sync

A band above the prompt that only appears when there is something to do:

```
⇅ main → origin/main  ↑2 to push  ↓3 to pull  (fetched 2 min ago)  fetch
```

- Runs `git fetch` in the background when the session starts and every 3 minutes, so "to pull" reflects the real remote, not just the last time you fetched.
- Recounts locally at the end of every turn, so a commit, checkout or `cd` shows up right away.
- Shows a toast when new commits to pull appear.
- Warns when the branch has no upstream.
- `fetch` button to refresh by hand.
- Never pulls or pushes for you, and never waits on a credentials prompt (`GIT_TERMINAL_PROMPT=0`).

It follows the session's working directory. Outside a git repo, nothing is shown.

### Install

At the prompt of a Claude Code terminal session:

```
/plugin install git-sync --marketplace sawady/sawady-claude-mods
```

Answer `y` to add the marketplace, then pick a scope (user scope = every session).

From a shell:

```
claude plugin install git-sync --marketplace sawady/sawady-claude-mods
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `sawady/sawady-claude-mods`, then **Add plugin**.

### Language

The `language` option is `auto` (default), `en` or `es`. `auto` uses Spanish when your locale (`LC_ALL`, `LC_MESSAGES` or `LANG`) is Spanish, English otherwise. Change it in `/config`, or in `~/.claude/settings.json`:

```json
{
  "pluginConfigs": {
    "git-sync@sawady-claude-mods": { "options": { "language": "es" } }
  }
}
```

## statusline

A [status line](https://docs.claude.com/en/docs/claude-code/statusline) for Claude Code:

```
📁 ~/code/app │ 🌿 main ●3 ↑1 │ 🧠 ctx 42% · 427k/1M │ 🤖 Opus 5.5 · high │ ⏳ 5h 12% · 7d 30% used │ 💾 16.6/20G free │ ⚙️ CPU 18% (8 cores) │ 🐳 2 up
```

| Segment | Shows |
|---|---|
| 📁 | Current folder |
| 🌿 | Git branch, uncommitted changes (`●N`), commits ahead/behind the upstream (`↑`/`↓`, from local refs) |
| 🧠 | Context used, as % and tokens over the window size |
| 🤖 | Model and effort level |
| ⏳ | Usage of the 5-hour and 7-day limits |
| 💾 | Free RAM over total |
| ⚙️ | CPU usage since the last refresh |
| 🐳 | Running Docker containers, or `off` when the daemon is down (cached for 5 s) |

Colors go green → yellow → red as usage climbs. It takes about 50 ms per refresh.

Requires Linux (or WSL) with `bash`, `jq` and `git`; `docker` is optional.

### Install

```bash
curl -fsSL https://raw.githubusercontent.com/sawady/sawady-claude-mods/main/statusline/statusline.sh -o ~/.claude/statusline.sh
chmod +x ~/.claude/statusline.sh
```

Then add this to `~/.claude/settings.json` (user scope, so it shows in every session):

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh",
    "padding": 0
  }
}
```

### Language

Set `CLAUDE_STATUSLINE_LANG` to `en` or `es` to pin the language; left unset (or `auto`) it follows your locale like `git-sync` does:

```json
"command": "CLAUDE_STATUSLINE_LANG=es ~/.claude/statusline.sh"
```

## Support

If these are useful to you, consider [sponsoring me on GitHub](https://github.com/sponsors/sawady). ❤️

## License

[MIT](LICENSE)
