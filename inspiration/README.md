# inspiration

Retro hacker-movie mode, as a Claude Code add-on. Silly, but friggin cool. Everything is drawn in colored text, so it works the same in the desktop app and the terminal.

## Commands

| Command | What it does |
| --- | --- |
| `/hack` | Opens **The Mainframe**, the side panel |
| `/hack close` | Closes it |
| `/hack spinner off` / `/hack spinner on` | Turns the hacker spinner off or back on (remembered) |
| `/hack theme off` / `/hack theme on` | Turns the Phosphor Rain look (below) off or back on (remembered) |

## Animations and what triggers them

### In the transcript

| Animation | Triggered by |
| --- | --- |
| **Hacker spinner**: green word, `[░░███░░]` bar, hex code, timer | Any time Claude is working. The word follows what it's doing: DECRYPTING / READING THE STATIC (thinking), INFILTRATING / BYPASSING ICE (using a tool), UPLOADING PAYLOAD (writing), REROUTING VIA *a random country* (calling the model) |
| **Orange eye spinner**: `◉ THE EYE IS WATCHING`, `EVERY TAB, ALL AT ONCE` | Claude using the built-in browser, or looking at an image, PDF or video |
| **Ship lane**: `··▓█▶···` with `⚠ HEAVY TRAFFIC` | Heavy workload (below) |

### Above the prompt

| Animation | Triggered by |
| --- | --- |
| `◉ ICE 2 daemons breaching the mainframe` | One or more subagents running (with a **Jack in** button if The Mainframe is closed) |
| `◉ THE EYE IS UPON example.com` | Claude used the built-in browser, or looked at an image or file (`THE EYE IS UPON 2.jpg`), in the last ~12 seconds |
| `⚠ BUSY` / `⚠ HEAVY TRAFFIC` | Busy or heavy workload |

Other plugins' rows (such as usage-band) keep showing; this one adds its row beneath theirs.

### Under the chat box: the ticker

One line after the usual hint (`esc to interrupt` and so on), always on, Mainframe open or not. It shows mini versions of what's happening right now:

| Mini | Triggered by |
| --- | --- |
| `( ◉ ) THE EYE IS UPON postimees.ee`, the pupil glancing around | Claude using the built-in browser, or looking at an image, PDF or video |
| `···~(\'>······`, the rabbit dashing across | A subagent finishes successfully |
| `···░▒▓██▙▖····`, the freighter crossing | Heavy workload |
| `◐ UPLINK ◆◆◆`, a spinning globe glyph, one `◆` per agent | Busy or heavy workload |
| `ICE 3` | Subagents running |

When nothing is going on, the line is left as Claude draws it.

### Above the chat box when The Mainframe is closed

With the side panel closed, the band above the prompt also plays the full-size art, the most striking one at a time and at most 8 rows: the Eye, then the rabbit, then the globe (with the freighter under heavy load).

### In The Mainframe

| Animation | Triggered by |
| --- | --- |
| **Agent card**: type, task, current tool, filling bar, timer | Claude starts a subagent |
| **ACCESS GRANTED** (amber) / **ACCESS DENIED** (red) | A subagent finishes or fails |
| **Rabbit** galloping across on all fours, under "Quick as a rabbit." | A subagent finishes successfully |
| **Traffic feed** of hex lines | Every tool call by Claude or its agents |
| **ASCII globe** spinning with a `◆` satellite per agent | **Busy**: 2+ agents running, or a prompt over ~600 characters, or 12+ tool calls in one turn |
| **ASCII cargo freighter** crossing under the globe | **Heavy**: 3+ agents, or a prompt over ~2000 characters, or 30+ tool calls in one turn |
| **ASCII Eye**: flickering flames, a slit pupil that looks around, the horns of a dark tower | Any built-in browser action (open, read, click, screenshot), an image pasted into the prompt, or any tool opening an image, PDF or video file; stays ~12 seconds after the last |

### Toasts

| Toast | Triggered by |
| --- | --- |
| `◉ EXPLORE daemon returned: ACCESS GRANTED (14s)` | A subagent finishes |
| `◉ … ACCESS DENIED (…). ICE got it.` | A subagent fails |
| `⚠ HEAVY TRAFFIC: recon drone dispatched. Scanning the cargo ship.` | The workload turns heavy (at most once a minute) |

## The look

In the desktop and mobile apps (the terminal draws no themes) the add-on also sets a dark-only theme, **Phosphor Rain**:

- Black-green surfaces with pale mint text, and phosphor-green accents (keywords, links, buttons).
- Teal strings, amber for warnings and variables (the Eye), neon magenta literals, ICE-red errors.
- Slow digital rain behind the chat, with a faint flickering Eye in the corner, under a dark glass veil so text stays readable. The rain stops moving if the system is set to reduce motion.

`/hack theme off` clears it and goes back to the app's own look; `/hack theme on` brings it back. Either is remembered across sessions.

## Tests

```bash
claude plugin test inspiration
```
