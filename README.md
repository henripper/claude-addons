# Claude Code add-ons

My Claude Code mods (plugins built from function hooks), kept in one place so every machine gets the same set.

| Add-on | What it does |
| --- | --- |
| [usage-band](usage-band) | Shows plan usage (5-hour session and weekly limits) and when each resets, in a row above the prompt |
| [servers](servers) | Lists dev servers listening on this machine in a row above the prompt, with a Kill button for each (`/servers`) |
| [inspiration](inspiration) | Retro hacker-movie mode, all in colored text: green hacker spinner, `/hack` opens The Mainframe side panel (a card per running agent, a rabbit galloping off when one finishes, a spinning globe under load, a cargo freighter under heavy load, the Eye while Claude browses), an `ICE` chip above the prompt while agents run, and a phosphor-green dark theme with digital rain. See [its README](inspiration/README.md) for every animation and what triggers it |

## Install on a new machine

macOS / Linux:

```bash
git clone https://github.com/henripper/claude-addons.git ~/.claude/mods && ~/.claude/mods/install.sh
```

Windows (PowerShell):

```powershell
git clone https://github.com/henripper/claude-addons.git $HOME\.claude\mods; & $HOME\.claude\mods\install.ps1
```

The script lists every add-on folder in `CLAUDE_CODE_PLUGIN_DIRS` in `~/.claude/settings.json`. Start a new Claude Code session (desktop app or terminal) to load them.

## Update

Run the install script again: it pulls the latest and re-registers every add-on, including new ones.

## Add a new add-on

Put it in its own folder here (with `.claude-plugin/plugin.json`), add a row above and an entry in `.claude-plugin/marketplace.json`, commit, push, then run the install script on the other machines.
