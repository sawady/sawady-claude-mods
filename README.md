# sawady-claude-mods

Mods and tweaks for [Claude Code](https://claude.com/claude-code) that keep the things I always want to see in view while I work.

| | What it is | What it does |
|---|---|---|
| [`git-sync`](#git-sync) | Claude Code mod (plugin) | Shows above the prompt whether the session's git repo has commits to push or pull, fetching in the background. |
| [`statusline`](#statusline) | Status line script | One line with folder, git, context usage, model and effort, usage limits, RAM, CPU and Docker. |

> The on-screen text is in Spanish (`para subir` = to push, `para bajar` = to pull, `libre` = free, `usado` = used).

## git-sync

A band above the prompt that only appears when there is something to do:

```
⇅ main → origin/main  ↑2 para subir  ↓3 para bajar  (fetch hace 2 min)  fetch
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

## statusline

A [status line](https://docs.claude.com/en/docs/claude-code/statusline) for Claude Code:

```
📁 ~/code/app │ 🌿 main ●3 ↑1 │ 🧠 ctx 42% · 427k/1M │ 🤖 Opus 5.5 · high │ ⏳ 5h 12% · 7d 30% usado │ 💾 16.6/20G libre │ ⚙️ CPU 18% (8 cores) │ 🐳 2 up
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

## Support

If these are useful to you, consider [sponsoring me on GitHub](https://github.com/sponsors/sawady). ❤️

## License

[MIT](LICENSE)
