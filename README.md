# Claude Code add-ons

My Claude Code mods (plugins built from function hooks), kept in one place so every machine gets the same set.

| Add-on | What it does |
| --- | --- |
| [usage-band](usage-band) | Shows plan usage (5-hour session and weekly limits) and when each resets, in a row above the prompt |

## Install on a new machine

macOS / Linux:

```bash
git clone https://github.com/REPLACE_ME/claude-addons.git ~/.claude/mods && ~/.claude/mods/install.sh
```

Windows (PowerShell):

```powershell
git clone https://github.com/REPLACE_ME/claude-addons.git $HOME\.claude\mods; & $HOME\.claude\mods\install.ps1
```

The script lists every add-on folder in `CLAUDE_CODE_PLUGIN_DIRS` in `~/.claude/settings.json`. Start a new Claude Code session (desktop app or terminal) to load them.

## Update

Run the install script again: it pulls the latest and re-registers every add-on, including new ones.

## Add a new add-on

Put it in its own folder here (with `.claude-plugin/plugin.json`), add a row above and an entry in `.claude-plugin/marketplace.json`, commit, push, then run the install script on the other machines.
