# Claude Code add-ons

My Claude Code mods (plugins built from function hooks), kept in one place so every machine gets the same set.

| Add-on | What it does |
| --- | --- |
| [usage-band](usage-band) | Shows plan usage (5-hour session and weekly limits) and when each resets, in a row above the prompt |
| [hack-the-planet](hack-the-planet) | Hackers (1995) + Matrix + Tolkien mode: green hacker spinner, `/hack` opens The Gibson pane (a card per running agent, the white rabbit diving down its hole when one finishes), an `ICE` chip above the prompt while agents run, and a pixel Eye of Sauron whenever Claude browses in the built-in browser. Under load a globe spins with a satellite per agent; under heavy load a 3D recon flyby of a cargo ship plays. `/hack spinner off` restores the stock spinner |

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
