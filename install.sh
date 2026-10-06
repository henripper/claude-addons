#!/usr/bin/env bash
# Install or update these Claude Code add-ons on macOS / Linux.
#   curl -fsSL https://raw.githubusercontent.com/<you>/claude-addons/main/install.sh | bash
# or, from a clone:  ./install.sh
set -euo pipefail
REPO_URL="${CLAUDE_ADDONS_REPO:-https://github.com/REPLACE_ME/claude-addons.git}"
DEST="$HOME/.claude/mods"

if [ -d "$DEST/.git" ]; then
  git -C "$DEST" pull --ff-only
else
  git clone "$REPO_URL" "$DEST"
fi

# Point Claude Code at every add-on folder (each has .claude-plugin/plugin.json).
python3 - "$DEST" <<'PY'
import json, os, sys
dest = sys.argv[1]
dirs = sorted(
    os.path.join(dest, d) for d in os.listdir(dest)
    if os.path.isfile(os.path.join(dest, d, ".claude-plugin", "plugin.json"))
)
path = os.path.expanduser("~/.claude/settings.json")
settings = json.load(open(path)) if os.path.exists(path) else {}
settings.setdefault("env", {})["CLAUDE_CODE_PLUGIN_DIRS"] = os.pathsep.join(dirs)
json.dump(settings, open(path, "w"), indent=2)
print("Enabled:", *(os.path.basename(d) for d in dirs))
PY
echo "Done. Start a new Claude Code session to load them."
