# ReForge — Kiroween 2026 Team Plan (v2: three repos, three owners)

> Supersedes the earlier monorepo plan. Written **Mon Nov 23, 2026**.
> **Hard deadline: Fri Dec 4, 2026, 2:00 PM Pacific (5:00 PM ET).** No extensions. We submit **Thu Dec 3**.
> Category: **Skeleton Crew**. Rules: <https://kiroween.devpost.com/rules>

---

## 0. TL;DR

- **Three repos, one owner each.** `ReForge-Engine` (Muhammad + Andrew), `ReForge-Dungeon` (Andrew), `ReForge-CyberOps` (Rakhmonjon). Games consume the engine as a **versioned release** (a vendored `reforge-engine.js` file), never by copying source.
- **The submission link is the Engine repo.** Devpost's Skeleton Crew rule says the submitted repo must contain **2 separate folders for the 2 apps**, plus `/.kiro` and an open-source license at the root. So the Engine repo also holds `dungeon-crawler/` and `cyberops/` as **real files** synced from the game repos with `git subtree` (history and authorship preserved, **no submodules**). The sync script is `scripts/sync-games.sh`. See §3.
- **We win on one claim, proven on camera:** *two different games, plus a third built live in the editor, with zero engine code changed.*
- **Kiro use is both a score (20%) and a disqualification gate.** Everyone builds inside Kiro and logs it daily. See §6.
- **Schedule (11 days left):** feature freeze **Sun Nov 29**, polish and video Nov 30 – Dec 1, dry run Dec 2, **submit Dec 3**.

---

## 1. Who owns what

| Member | Owns | Repo / folder |
|---|---|---|
| **Muhammad Abdulrehman** | Engine runtime, rules, behaviors, UI widgets, releases; submission integration (subtree sync, repo hygiene); Kiro write-up; Devpost form | `ReForge-Engine` → `engine/`, `scripts/`, `.kiro/`, `docs/` |
| **Andrew Hellmann** (org owner/admin) | Visual editor; Dungeon game (authored *with the editor*); GitHub admin (Pages, settings); third-game demo; blog post | `ReForge-Engine` → `editor/` · `ReForge-Dungeon` |
| **Rakhmonjon Karimov** | CyberOps game; art/audio/theme (style guide, CSS tokens); demo video + Devpost text and screenshots | `ReForge-CyberOps` |

Roles are by area: swap tasks freely if someone is faster at something, but tell the group chat so nobody works twice.

**Folder ownership inside the Engine repo** (put in `CODEOWNERS`): `/engine/` → Muhammad, `/editor/` → Andrew, `/docs/CONTRACT.md` and `/engine/src/schema/` → all three must approve, `/dungeon-crawler/` and `/cyberops/` → **never edit directly** (they are synced from the game repos).

---

## 2. Rules that matter (full list: Devpost → Rules tab)

| # | Requirement | Owner |
|---|---|---|
| R1 | Built **with Kiro**; "insufficient use of Kiro will result in disqualification" | All |
| R2 | **Public GitHub** repo with all source, assets, run instructions | Muhammad |
| R3 | **Open-source license** visible in the repo's About box (MIT) | Muhammad (Day 1) |
| R4 | **`/.kiro` at repo root** (specs, hooks, steering). **Never gitignore it.** | All |
| R5 | Skeleton Crew: repo has **2 separate folders for the 2 apps** | Muhammad (§3) |
| R6 | Working app URL(s), free and public through Jan 29, 2027 | Andrew (deploy) |
| R7 | Text description | Rakhmonjon |
| R8 | Demo video **< 3:00**, public on **YouTube**, no copyrighted music/trademarks | Rakhmonjon |
| R9 | **Kiro write-up** answering the judges' questions (§6) | Muhammad |
| R10 | All work built after **Oct 30, 2026**; disclose templates/CC0 packs | All |
| R11 | Team ≤ 3; one **Representative** submits | Decide Day 1 |

**Judging:** five criteria, 20% each: Potential Impact · Technological Implementation (Kiro use) · Design · Innovation · Presentation.

**Bonus prizes we can stack on top of the category prize:**
- **Best Student Project: Skeleton Crew** ($1,500 + Kiro Pro Max): **all three must be students**. Provide LinkedIn, student email, year/degree, and school for each.
- **Bonus Blog Prize** (2,000 Kiro credits ×100): public post on a third-party blog (dev.to / Hashnode / Medium) **that says it was written for Kiroween 2026**. Owner: **Andrew**, publish by Dec 2.
- **Social Blitz** (3-mo Kiro Pro+ ×5): post starting with **`#KiroweenHackathon26`**, original voice (judged against AI-sounding text), one concrete thing about Kiro. **Each person writes their own.** Post by Dec 2.
- **Best Demo** ($1,000): automatic if the video is top-10% overall and tops Presentation.

---

## 3. Repo architecture and how the three repos fit together

```
ReForge-Engine  (SUBMISSION REPO — the link we give Devpost)
├── .kiro/                 specs/ steering/ hooks/ agents/   ← committed, never ignored
├── LICENSE                MIT
├── README.md              pitch, GIFs, links to the 3 live demos, run instructions
├── KIRO_LOG.md            daily Kiro notes (source for the write-up)
├── CODEOWNERS
├── docs/                  PLAN.md, CONTRACT.md, behaviors.md (generated)
├── engine/                runtime, rules, behaviors, UI widgets, schema   (Muhammad)
├── editor/                React visual editor                              (Andrew)
├── examples/ghost-catcher/    the "third game", built in the editor
├── scripts/               sync-games.sh, check-submission.sh
├── dungeon-crawler/       ← synced from ReForge-Dungeon (git subtree)  — do not edit here
└── cyberops/              ← synced from ReForge-CyberOps (git subtree) — do not edit here

ReForge-Dungeon   index.html · game.json · assets/ · theme.css · vendor/ · .kiro/ · LICENSE
ReForge-CyberOps  index.html · game.json · assets/ · theme.css · vendor/ · .kiro/ · LICENSE
```

### The three integration seams

1. **Contract** (`docs/CONTRACT.md`): the `game.json` format, behavior catalog, public API. Frozen Day 1. Everybody codes against it from hour one.
2. **Engine → games = GitHub Releases.** Tagging `vX.Y.Z` on the Engine repo publishes assets: `reforge-engine.js`, `reforge-engine.css`, `behaviors.manifest.json`, `game.schema.json`. A game repo runs `node scripts/update-engine.mjs vX.Y.Z` to download them into `vendor/` (pinned in `vendor/VERSION`). No npm account, no build step in the game repos. A game folder is just `index.html` + `game.json` + assets. **No custom game code.**
3. **Games → submission repo = `git subtree`.** `scripts/sync-games.sh` (Muhammad runs it) pulls each game's `main` into `dungeon-crawler/` and `cyberops/` as normal files with full commit history (each teammate keeps credit), then mirrors each game's `.kiro/{specs,steering,hooks,agents}` into the **root** `.kiro/` with a `dungeon-` / `cyberops-` prefix so the judges' root-level check sees everything. Run it on Wed Nov 25, Sat Nov 28, Mon Nov 30, and on Dec 2 as the final sync. `scripts/check-submission.sh` verifies license, `.kiro`, both folders, and no submodules.

### Tech
TypeScript + Vite, Canvas 2D renderer with a DOM overlay for HUD and panels (lean on purpose: it's a *skeleton*). Editor in React. Tests with Vitest + **fast-check** (property-based). Games are static sites: deploy each to **GitHub Pages** (Andrew enables on all three repos; fallback Vercel).

---

## 4. Timeline

| Day | Date | Milestone (end of day) |
|---|---|---|
| **1** | Mon Nov 23 | **Foundations**: contract frozen, MIT licenses, `.kiro` steering committed, Pages enabled, everyone on Devpost + one team, Kiro credits requested, game-repo scaffolds pushed |
| **2** | Tue Nov 24 | Engine loads a `game.json`, draws a scene, moves a player → **release `v0.0.1`** (proves the vendoring flow). Editor shell opens a scene. Both game owners have assets + design one-pagers |
| **3** | Wed Nov 25 | **Rules engine + batch-1 behaviors → `v0.1.0`.** Dungeon room 1 playable. Editor places/edits entities and saves `game.json`. First `sync-games.sh` run |
| **4** | Thu Nov 26 | *(Thanksgiving, light day)* UI widgets (`text/bar/button/panel/modal/list/log/table`), timers, `spawnFromTable` → **`v0.2.0`**. Editor rule builder started |
| **5** | Fri Nov 27 | `ai`, `inventory`, `node` graph, `playSound`, `emit` → **`v0.3.0`**. Dungeon rooms 2–4. CyberOps network map up. Editor ▶ Play works. **All three apps deployed to live URLs** |
| **6** | Sat Nov 28 | Both games playable start-to-finish. **Third game (Ghost Catcher) built in the editor.** Bug fixes → `v0.4.0`. Second sync |
| **7** | Sun Nov 29 | **FEATURE FREEZE at noon.** `v1.0.0`. Video footage captured, README/write-up drafted, **Devpost draft saved with every field filled** |
| 8–9 | Mon Nov 30 – Tue Dec 1 | Polish, final video edit, upload to YouTube (public), blog + social posts written |
| 10 | Wed Dec 2 | Final sync, fresh-clone test, publish blog + social, second person reads the whole Devpost form |
| **11** | **Thu Dec 3** | **SUBMIT** (Representative). Screenshot confirmation. |
| — | Fri Dec 4, 2 PM PT | Hard deadline. Emergency buffer only. |

**Daily sync:** 15 minutes at a fixed time, or a 3-line message: *done / doing / blocked*.

---

# 5. TASKS BY MEMBER

Legend: 🟣 = produces Kiro evidence for the write-up (take a screenshot, add 2 lines to `KIRO_LOG.md`).

---

## 👤 Muhammad — Engine (`ReForge-Engine/engine/`) + integration + Kiro lead

You are the **critical path**: Andrew's editor and both games wait on your releases. Ship small and often.

### Mon Nov 23 — Foundations
- **M1. Repo setup (Engine).** MIT `LICENSE`, `CODEOWNERS`, `.gitignore` (**must not list `.kiro`**), pnpm workspace (`engine/`, `editor/`), ESLint/Prettier/Vitest/fast-check, CI (typecheck, lint, test, build). Merge the docs PR (`docs/PLAN.md`, `docs/CONTRACT.md`, `scripts/`).
- **M2. 🟣 Steering.** In Kiro, create `.kiro/steering/`: `product.md` (what ReForge is, the "no custom code in games" rule), `tech.md`, `structure.md`, `behavior-authoring.md` (register → type → test → doc). Test: a fresh Kiro chat answers "how do I add an action?" from steering alone.
- **M3. Contract sign-off.** Get Andrew and Rakhmonjon to approve `docs/CONTRACT.md` (PR review). Freeze.
- **M4. Team admin.** Everyone registers on Devpost and joins the hackathon; form the team; **pick the Representative**; request Kiro credits (Devpost → Resources); confirm nobody is in an excluded country; confirm whether all three are students.

### Tue Nov 24 — Core runtime → **release v0.0.1**
- **M5. 🟣 Spec `engine-core`** (`.kiro/specs/engine-core/`: requirements → design → tasks), then implement with Kiro: fixed-timestep loop, entities + components, scene loader, input, camera, Canvas renderer, asset loader, public `createGame()` API per the contract.
- **M6. Release pipeline.** GitHub Action: on tag `v*`, build and attach the four assets from CONTRACT §4. Cut **`v0.0.1`** so the game repos can test `update-engine.mjs`.
- *Done when:* a `game.json` with one player sprite runs in a browser and moves with arrow keys.

### Wed Nov 25 — Rules engine → **v0.1.0** ⚠️ unblocks everyone
- **M7. 🟣 Spec `rules-system`:** event bus, `when/if/then` interpreter, variables store with `varChanged` events, seeded RNG, **behavior registry** with typed parameter descriptors (the editor builds its forms from these).
- **M8. Batch-1 behaviors:** events `start/tick/key/collide`; conditions `varEq/Lt/Gt`, `random`; actions `setVar/addVar/destroy/spawn/damage/heal/showText/changeScene/win/lose`; components `mover/collider/health/sprite`.
- **M9. 🟣 Property-based tests (fast-check):** rules interpreter deterministic for a given seed; `addVar` then inverse restores state; load → serialize → load round-trips; collision is symmetric; invalid JSON is always rejected, never crashes.
- **M10. First sync.** Run `scripts/sync-games.sh` once Andrew's/Rakhmonjon's repos have a commit.
- *Done when:* a rule written in JSON works in the browser. Cut **`v0.1.0`**, post in chat.

### Thu Nov 26 — UI + timers → **v0.2.0**
- **M11. UI widgets (DOM overlay):** `text`, `bar`, `button`, `panel`, `modal`, `list/log`, `table`, themable via CSS variables. Actions `openPanel/closePanel/log`.
- **M12. Timers and tables:** `startTimer` + `timer` event, `spawnFromTable` (weighted random), `setProp`, `move`.
- **M13. 🟣 Hooks:** on save in `engine/src/behaviors/**` → run tests and regenerate `behaviors.manifest.json` + `docs/behaviors.md`; on save of `schema/` → regenerate `game.schema.json` and validate all example games. Commit under `.kiro/hooks/`.

### Fri Nov 27 — Game #2 enablers → **v0.3.0**
- **M14.** `ai` (chase/patrol/flee), `inventory` + `giveItem/hasItem`, `died` event, `playSound`, `emit`/`custom` event.
- **M15.** `node` component + graph rendering (links, click/hover, status colors), generic enough for any graph/map.
- **M16.** Triage `engine-gap` issues daily; each gets a fix or a documented workaround within 24 h.

### Sat Nov 28 — Hardening → **v0.4.0**
- **M17.** Bug fixes from both games and the editor. 60 fps check, memory on scene change, Chrome/Firefox/Safari.
- **M18. 🟣 (Stretch, cut first if late) `reforge-mcp`:** tiny MCP server with `list_behaviors`, `validate_game`, `describe_schema`, `lint_rules`; registered in `.kiro/settings/mcp.json`, so Kiro can author and validate games itself. Great for the MCP question and a killer 10 seconds in the video.
- **M19.** Second sync; run `scripts/check-submission.sh`.

### Sun Nov 29 — Freeze → **v1.0.0**
- **M20. 🟣 Kiro write-up** (see §6) from `KIRO_LOG.md` + screenshots.
- **M21.** README for the Engine repo (pitch, GIFs, 3 live links, run steps), `docs/getting-started.md` ("make a game in 5 minutes").
- **M22.** Tag **`v1.0.0`**; tell both game owners to update `vendor/` and re-verify.

### Dec 1–3
- Final sync (Dec 2), fresh-clone test on a clean machine, Devpost submission as Representative (or coordinate if someone else is).

---

## 👤 Andrew Hellmann — Editor (`ReForge-Engine/editor/`) + Dungeon game (`ReForge-Dungeon`) + admin

You are the product the judges *see*: the editor is the star of the demo. You also author the Dungeon **using the editor** (dogfooding finds the bugs), and you hold org admin.

### Mon Nov 23
- **A1. Admin:** enable **GitHub Pages** on all three repos (Settings → Pages → GitHub Actions); give Muhammad and Rakhmonjon **write** access everywhere; turn on branch protection for `main` in the Engine repo (1 review).
- **A2. Review and approve `docs/CONTRACT.md`.** Flag anything you cannot build a form for.
- **A3. 🟣 Spec `editor`** (`.kiro/specs/editor/`): panels, state model (the editor state *is* the `game.json` object; every action is a pure function on it).
- **A4. Dungeon repo scaffold:** `index.html` + bootstrap, `vendor/`, MIT license (the scaffold PR gives you a starting point), your own `.kiro/` steering.
- **A5.** Rough mockup: palette (left) · scene canvas (center) · inspector (right) · rule builder (bottom) · top bar (Save / Load / ▶ Play / Export). Agree theme tokens with Rakhmonjon.

### Tue Nov 24 — Editor shell
- **A6.** React + Vite scaffold in `editor/`; loads a `game.json`; scene canvas with grid, pan/zoom, renders entities (simple rects until `v0.0.1` renderer is usable).
- **A7.** Dungeon design one-pager: 4 rooms, 3 enemy types (skeleton chaser, ghost patroller, boss), key + locked door, potions, sword, win/lose. List each mechanic's events/conditions/actions against the catalog. Pick CC0 art (Kenney "Tiny Dungeon" or similar), record licenses in `assets/CREDITS.md`.

### Wed Nov 25 — Authoring basics
- **A8.** Palette + placement: place, move, delete, duplicate, multi-select, snap-to-grid.
- **A9.** Inspector: forms **auto-generated from `behaviors.manifest.json`** param descriptors (number/text/select/color/asset). Never hard-code behaviors in the editor.
- **A10.** Save / Load / Export `game.json`; validate with the engine validator; inline errors; autosave to localStorage.
- **A11.** Dungeon room 1 on `v0.1.0`: movement, walls, key, door, one enemy, HP bar. File `engine-gap` issues for anything missing.

### Thu Nov 26 — Rule builder
- **A12.** Rule builder UI: rows of **WHEN [event ▾] · IF [condition ▾] · THEN [action ▾]** with typed params, add/remove/reorder, plain-English preview ("When *player* touches *key*, add 1 to *keys*").
- **A13. 🟣 Property tests (fast-check) on editor state:** any sequence of edit operations yields schema-valid JSON; undo∘redo = identity; save → load round-trips.

### Fri Nov 27 — Play + deploy
- **A14.** ▶ **Play button:** run the current game in an embedded `createGame` panel; Stop/Restart; runtime errors in a console panel.
- **A15.** Undo/redo, scenes (add/rename/switch), variables panel, UI-widget editor, asset import.
- **A16.** Dungeon rooms 2–4 with chase/patrol enemies, combat, potions, boss, win/lose. **Deploy editor and Dungeon** to Pages; test on a different device.

### Sat Nov 28 — The proof
- **A17. Build the third game "Ghost Catcher" in the editor** (with Rakhmonjon, recorded): collect orbs, dodge ghosts, 60-second timer. Use **only** the editor and existing behaviors. Time it; commit as `examples/ghost-catcher/`. `git diff` on `engine/` for that commit must be **empty** (screenshot for the video).
- **A18.** Starter templates ("Blank", "Top-down", "Click-and-manage") so a newcomer reaches something playable in 30 seconds.
- **A19.** Dungeon polish: sounds, title screen, controls hint, game-over + restart. A stranger can finish it in about 3 minutes without help.

### Sun Nov 29 — Freeze
- **A20.** Record the editor segments for the video (1080p, clean desktop, visible cursor). The 30-second "build a game live" shot is the most important in the video.
- **A21.** Bug bash on a fresh browser profile; update Dungeon `vendor/` to `v1.0.0`.

### Dec 1–2
- **A22. Blog post** (Bonus Blog Prize): publish on dev.to/Hashnode/Medium by Dec 2. Must say it is written for **Kiroween 2026**. Outline: pitch → what ReForge is → the zero-code proof → how Kiro helped (specs, hooks, steering, PBT, MCP) with real screenshots → what surprised us → links.
- **A23.** Your own Social Blitz post (in your own words).

---

## 👤 Rakhmonjon Karimov — CyberOps game (`ReForge-CyberOps`) + art/theme + video

You are the engine's toughest customer: CyberOps is the game that proves the engine isn't a one-trick dungeon crawler. Your most valuable output is **the precise list of what the engine can't do yet**: post each gap as an `engine-gap` issue the moment you hit it.

**Hard rule:** no custom JS/TS in `ReForge-CyberOps` beyond the 3-line `createGame` bootstrap.

### Mon Nov 23
- **R1.** Review and approve `docs/CONTRACT.md`. Try writing a node + incident rule by hand in JSON; note anything awkward.
- **R2.** Scaffold `ReForge-CyberOps` from the template in the scaffold PR: `index.html`, `vendor/`, `scripts/update-engine.mjs`, MIT `LICENSE`, your own `.kiro/` steering.
- **R3. Style guide + theme:** 5-colour spooky palette, 2 fonts, button/panel style → `docs/style.md` in the Engine repo and CSS variables the widgets use. Share with Andrew by tonight so editor and games match.
- **R4. Assets (CC0 only):** terminal font + icons for CyberOps, 6–10 sound effects, one ambient loop, plus anything Andrew needs for the Dungeon. Record each license in `assets/CREDITS.md`.

### Tue Nov 24 — Design
- **R5. 🟣 Spec `cyberops`** in `.kiro/specs/cyberops/` — **"Ghost in the Machine"**: a click-driven management sim on a fictional company network (malware = ghosts haunting it). Include the **incident table** (type, symptoms, correct fix, penalty, time cost), node list + links, log lines for investigations, HUD variables (`uptime`, `budget`, `threat`, `breach`), win/lose conditions. Check every mechanic against the behavior catalog.
- **R6.** Hand-write the first `game.json` against the contract (it is a contract test; it may not run yet).

### Wed Nov 25 — First run
- **R7.** On `v0.1.0` get the title scene and HUD variables running; file `engine-gap` issues for everything missing (graph nodes, log panel, table).

### Thu Nov 26 — UI on `v0.2.0`
- **R8.** Network map scaffolding, incident feed (`log` widget), investigation panel (`panel` + `list`), response buttons. Timers spawn incidents from `spawnFromTable`.

### Fri Nov 27 — Core loop on `v0.3.0`
- **R9. Playable core loop:** ~8 nodes (router, firewall, web server, DB, 3 workstations, backup). Incident spawns → player opens the node → reads logs → diagnoses → picks a response (scan / isolate / patch / restore backup / block IP) with time or budget cost → correct = recovered, wrong or slow = breach meter rises. Win = survive N minutes; lose = breach meter full.
- **R10.** 30-second tutorial scene so judges get it instantly. Deploy to Pages (Andrew enabled it).

### Sat Nov 28 — Content + polish
- **R11.** 5 incident types × 2–3 log variants (phishing, ransomware, brute force, DDoS, data exfiltration), escalating difficulty, end-of-run report ("You stopped 7/9 incidents").
- **R12.** Spooky polish (Design is 20% of the score): title screen, transitions, sounds, consistent fonts/colours with the editor and Dungeon.
- **R13.** Help Andrew build **Ghost Catcher** in the editor (you are the "first-time user": narrate what is confusing; that feedback is gold).

### Sun Nov 29 — Freeze + footage
- **R14.** Update `vendor/` to `v1.0.0`, re-verify the game, fix regressions.
- **R15.** Record gameplay segments for the video (Dungeon + CyberOps), clean 1080p, no notifications on screen.

### Mon Nov 30 – Tue Dec 1 — Video + text
- **R16. Edit the demo video, target 2:50, hard cap 3:00**, upload to **YouTube, public**, captions on; no copyrighted music (CC0 or none); check it plays logged-out.

| Time | Shot |
|---|---|
| 0:00–0:12 | Hook: "Every game starts from the same bones." Skeleton assembling into the ReForge logo |
| 0:12–0:30 | The problem (repeated boilerplate) and who it's for (students, jam teams, teachers, indie devs) |
| 0:30–1:00 | **Editor:** place an enemy, add a rule with dropdowns, press ▶ Play. "No code. Just behaviors." |
| 1:00–1:30 | **Dungeon:** fight, key, door, boss |
| 1:30–2:00 | **CyberOps:** incident pops, read logs, isolate a node, breach meter drops. "Same engine. Totally different game." |
| 2:00–2:30 | **The proof:** build Ghost Catcher live in ~30 s with a visible timer, play it, then terminal: `git diff engine/` → *empty* |
| 2:30–2:50 | **Kiro montage:** specs → tasks, hook firing, steering, PBT counterexample, MCP; end card with URLs and repo |

- **R17. Devpost text description:** Inspiration · What it does · How we built it · Challenges · Accomplishments · What we learned · What's next. Plus screenshots and a thumbnail.
- **R18.** Your own Social Blitz post (in your own words), by Dec 2.

---

## 6. Kiro usage plan (20% of the score and a disqualification gate)

Judges explicitly ask about each item below. Build the evidence **on purpose, while building**.

| Judges ask about | What we will have | Owner |
|---|---|---|
| IDE vs CLI vs Web vs Crew | Use at least IDE + CLI; one honest comparison paragraph. Try Kiro Crew for parallel work if available | All |
| Custom agents | 1–2 agents (e.g. `level-designer`: knows schema + catalog, edits only `game.json`; `reviewer`: checks PRs against steering). Say how they changed the work | Muhammad, Rakhmonjon |
| Agent hooks | (1) save in `behaviors/` → tests + regenerate manifest/docs; (2) save in `schema/` → regenerate JSON Schema + validate examples; (3) save `game.json` → validate + lint rules | Muhammad |
| Spec-driven development | One spec per feature: `engine-core`, `rules-system`, `editor`, `dungeon`, `cyberops`, (`reforge-mcp`). Compare with one small feature done by vibe-coding | All |
| Steering docs | `product.md`, `tech.md`, `structure.md`, `behavior-authoring.md`, `spooky-design.md`. Note which one changed Kiro's output most | Muhammad, Rakhmonjon |
| MCP | `reforge-mcp` (stretch) + at least one off-the-shelf MCP (GitHub for issues/PRs, and/or a browser MCP to screenshot-test games) | Muhammad |
| Property-based testing | fast-check on the rules interpreter, schema round-trip, editor undo/redo, collisions. **Write down any bug PBT found that unit tests missed** | Muhammad, Andrew |
| Kiro powers | Install only what is genuinely useful; say what each gave us | Muhammad |

**Rules of the road**
- **Build inside Kiro** from day 1, not once at the end. The history of specs, hooks, and steering must be genuine and honestly described.
- **`KIRO_LOG.md`** in the Engine repo: each person adds 2–3 bullets per day (*what I used, what worked, what surprised me, screenshot filename*). The write-up is assembled from this, not from memory.
- Screenshot early: a spec generating tasks, a hook firing, steering changing an answer, PBT shrinking a counterexample, an MCP call.
- Each game repo has its own `.kiro/`; `sync-games.sh` mirrors it into the Engine repo's root `.kiro/`. Never put `.kiro` in any `.gitignore`.

---

## 7. Submission checklist (dry run Dec 2, submit Dec 3)

- [ ] Devpost: all 3 registered, **team formed**, Representative identified, category = **Skeleton Crew**, bonuses ticked (Student only if all 3 qualify; Blog; Social Blitz)
- [ ] Engine repo **public**; **MIT license visible in About**; **`/.kiro` at root, not gitignored**; `dungeon-crawler/` and `cyberops/` present with real files; no `.gitmodules`; `scripts/check-submission.sh` passes
- [ ] Fresh-clone test on a machine that isn't yours: each app runs from its README
- [ ] **Three live URLs** (editor, Dungeon, CyberOps) open without login in Chrome/Firefox/Safari
- [ ] Video < 3:00, YouTube **public**, plays logged-out
- [ ] Text description + images + **Kiro write-up** that answers every §6 question specifically
- [ ] Student details for all 3 (if claiming Student prize)
- [ ] Blog URL + each person's social URL (own words, `#KiroweenHackathon26` first)
- [ ] `assets/CREDITS.md` in each game; pre-existing code/assets disclosed
- [ ] A second person reads the whole form; submit Dec 3; screenshot the confirmation

---

## 8. Risks and the cut list

| Risk | Mitigation |
|---|---|
| **Engine slips → both others blocked** | Contract frozen Day 1 so Andrew/Rakhmonjon work against mock JSON; `v0.0.1` Day 2 proves the pipeline; if Muhammad is behind on Wed noon, Andrew pairs on widgets/tests |
| **CyberOps is the long pole** | MVP = 6 nodes, 3 incident types, win/lose. More incident types are a bonus |
| **Editor too ambitious** | Must-have: place/move/delete, inspector, rule builder, ▶ Play, save/load. Nice: undo/redo, templates, asset import |
| **Kiro use looks thin** | `KIRO_LOG.md` from today; Muhammad audits it Thu and Sat |
| **Video rushed** | Footage Sun Nov 29, editing Nov 30–Dec 1 |
| **Subtree sync surprises** | First sync Wed Nov 25, not Dec 2. Never edit game folders in the Engine repo |
| **Deploy surprises (base paths, CORS)** | Deploy a hello-world to Pages on Day 2, not Day 6 |
| **Thanksgiving Thu Nov 26** | Planned as a light day; anything that slips lands on Fri/Sat, which have slack |

**Cut order if time runs out:** `reforge-mcp` → editor undo/redo + templates → boss fight / extra rooms → extra CyberOps incident types → save/load state → blog.
**Never cut:** both games playable and deployed · editor ▶ Play · third-game proof · `.kiro` evidence · video · Kiro write-up.

---

## 9. Working agreements

- **Branches and PRs:** short-lived branch → PR → one teammate approves → squash merge. Plain commit messages. Each person commits as themselves.
- **Definition of done:** merged to `main`, CI green, deployed (where applicable), noted in `KIRO_LOG.md`.
- **`engine-gap` issues:** label them; Muhammad triages daily.
- **Schema/contract:** additive changes are fine; breaking changes need all three approvals.
- **No secrets in git.** Everything is public.
