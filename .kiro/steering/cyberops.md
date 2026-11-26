---
inclusion: always
---

# Ghost in the Machine

CyberOps is a data-only game. The player is the only analyst on the night shift. Malware is a haunting on a company network. The player reads logs, picks one response, and tries to finish a 3-minute shift before the breach meter hits 100.

## Rules

- Eight nodes: edge router, firewall, web server, database, backup, Desk A, Desk B, Desk C.
- Five hauntings: phishing, ransomware, brute force, flood, quiet copy.
- Each haunting has exactly one correct response.
- Responses: Isolate, Block address, Patch edge, Deep scan, Restore. Each spends budget and takes time.
- A correct response clears that node and drops breach by 5.
- A wrong response does not clear it and adds that haunting's wrong penalty.
- An open haunting raises breach every second. At 24 seconds it spreads. At about 46 seconds the node is lost.
- Win: the clock reaches 180 seconds and breach is under 100.
- Lose: breach reaches 100.
- The first alert is always phishing on Desk A, so a new player can learn the loop.
- At most 2 open hauntings early, 3 later.
- Full shift budget starts at 560. Breach starts at 4.

## No custom code

This game is `cyberops/game.json`, `cyberops/theme.css`, and `cyberops/assets/`. The only script allowed later is the 3-line engine bootstrap in `index.html`. Do not write gameplay in JavaScript. If a rule cannot be expressed with the catalog in `docs/CONTRACT.md`, file a generic `engine-gap` issue on ReForge-Engine. Do not solve it with game code.

## Assets

CC0 or a license we can ship, recorded in `cyberops/assets/CREDITS.md`. No copyrighted art, fonts, or music. No asset is required for the first version. Nodes are drawn by the engine's `shape` and `label` components.

## Palette

Use `docs/style.md`.

- Ink `#0c0d0b` background
- Bone `#e7e4d8` text
- Ember `#e07a3d` alerts and the breach meter
- Ghost `#8aa384` healthy and success
- Line `#2a2c26` borders

## Names

- Ids are kebab-case: `edge-router`, `brute-force`, `lose-if-breach-full`.
- Rule ids say what they do.
- Scene ids: `title`, `briefing`, `floor`, `report`.