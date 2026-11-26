# Design

## Variables

| Name | Start | Bounds | Meaning |
|---|---:|---|---|
| budget | 560 | 0 or more | Money left. Responses subtract their cost. |
| breach | 4 | 0 to 100 | Loss at 100. |
| clock | 0 | 0 to 180 | Seconds on a full shift. |
| uptime | 100 | 0 to 100 | Shown percent. Not spent by the player. |
| stopped | 0 | 0 or more | Hauntings cleared. |
| spawned | 1 | 1 or more | Hauntings that appeared. Starts at 1 because Desk A is immediate. |
| wrong | 0 | 0 or more | Wrong responses that finished. |
| threatLevel | 1 | 0 to 3 | 0 Calm, 1 Elevated, 2 High, 3 Critical. |

Uptime drops 8 for each haunted or in-progress node, and 14 for each lost node.

Threat bands: Critical if breach is 75 or more, or 3 hauntings are open. High if breach is 48 or more, or 2 are open. Elevated if any haunting is open or breach is 18 or more. Otherwise Calm.

A drill is the same rules with clock max 90 and a faster first spawn. The full shift is the one we ship.

## Nodes

All start healthy except Desk A, which starts haunted when the shift begins.

| Id | Name | Kind | Links |
|---|---|---|---|
| edge-router | Edge router | router | firewall |
| firewall | Firewall | shield | edge-router, web, database, ws-a, ws-b, ws-c |
| web | Web server | globe | firewall |
| database | Database | database | firewall, backup |
| backup | Backup | drive | database |
| ws-a | Desk A | monitor | firewall |
| ws-b | Desk B | monitor | firewall |
| ws-c | Desk C | monitor | firewall |

Map positions are percentages of the graph area: edge-router 50,16; firewall 50,38; web 18,64; database 50,64; backup 34,88; ws-a 78,46; ws-b 84,68; ws-c 70,88.

## Responses

| Id | Label | Cost | Seconds | Fixes |
|---|---|---:|---:|---|
| isolate | Isolate | 40 | 6 | Phishing |
| block | Block address | 30 | 5 | Brute force |
| patch | Patch edge | 80 | 9 | Flood |
| scan | Deep scan | 60 | 8 | Quiet copy |
| restore | Restore | 120 | 11 | Ransomware |

Only one response may run at a time. Breach does not rise on the node being worked. A wrong response still spends the budget.

## Incident table

| Id | Name | Weight | Hosts | Correct | Breach / sec | Wrong | Slow | Fail | Slow after | Fail after |
|---|---|---:|---|---|---:|---:|---:|---:|---:|---:|
| phishing | Phishing | 3 | ws-a, ws-b, ws-c | isolate | 0.32 | 10 | 6 | 12 | 24 | 46 |
| ransomware | Ransomware | 2 | database, web, backup | restore | 0.48 | 16 | 10 | 16 | 22 | 44 |
| brute-force | Brute force | 3 | firewall, edge-router, web | block | 0.30 | 9 | 6 | 11 | 24 | 46 |
| ddos | Flood | 2 | edge-router, firewall | patch | 0.40 | 13 | 8 | 14 | 22 | 44 |
| exfil | Quiet copy | 2 | database, web | scan | 0.38 | 12 | 8 | 14 | 24 | 46 |

Breach per second is multiplied by `1 + clock / 240`.

### Log lines

Phishing

- MAIL gateway accepted payroll-adjustment.lnk for j.okonkwo / EDR a desk process read the browser cookie store / DNS that desk queried a lookalike of the company domain
- USER opened a shared doc titled urgent voicemail / AUTH a second session appeared on the same desk four minutes later / PROXY the desk posted credentials to an external form
- CHAT link preview from an outside tenant, clicked / EDR unusual child process under the mail client / NET desk beaconing out every 40 seconds

Ransomware

- FS share-finance: 1,840 files renamed to .wraith / NOTE dropped on the volume: THE VAULT IS HAUNTED / BKUP last clean snapshot is still sealed
- AV encryption burst on the data volume, shadow copies deleted / SMB a ransom note is being written across the mapped drive / BKUP the offline copy was not touched

Brute force

- AUTH 612 failures on ssh from 203.0.113.66 in four minutes / VPN the same address is trying the break-glass account / HOST no new binary on disk
- WAF credential stuffing against /login from one address / AUTH staff lockouts are spreading / NET source 198.51.100.23, no payload observed

Flood

- EDGE SYN flood, 48k packets per second, customers timing out / FW rulepack is two versions behind the rate-limit advisory / FLOW no single inside host owns the traffic
- EDGE UDP reflection, uplink saturated / NOC legitimate sessions are being dropped at the firewall / CFG the emergency filter patch is staged, not applied

Quiet copy

- DB full-table reads at 02:17 with no matching ticket / EGRESS steady 2.1 MB/s to a new network on port 443 / EDR no malware binary, just a scripted copy
- PROXY long-lived TLS from a database user to an unseen host / DLP customer rows leaving in small slices / PROC nothing noisy on the endpoint itself

### Floor card

| Haunting | What the log means | Response |
|---|---|---|
| Phishing | A person opened something. A desk is beaconing. | Isolate |
| Ransomware | Files renamed. A note. Backup still clean. | Restore |
| Brute force | One address. Failures. No payload. | Block address |
| Flood | The edge is drowning. The patch is staged. | Patch edge |
| Quiet copy | Rows leaving slowly. No binary. | Deep scan |

## Catalog mapping

Use only names from the Day-1 catalog. Param names may change when `docs/CONTRACT.md` is frozen.

| Mechanic | When | If | Then |
|---|---|---|---|
| Shift start | click Begin | inScene briefing | setVar clock 0, changeScene floor, spawn phishing on ws-a, log the greeting |
| Later hauntings | timer spawn | entityCount open incidents below the cap | spawnFromTable incidents |
| Pick a response | click that button | varGt budget cost-minus-one | addVar budget by minus cost, startTimer job |
| Timer finished, correct | timer job | chosen id equals the incident correct id | setProp node healthy, addVar breach -5, addVar stopped 1, log clear |
| Timer finished, wrong | timer job | chosen id differs | addVar breach by wrong penalty, addVar wrong 1, log miss |
| Too slow | timer on that incident | still open | addVar breach by slow penalty, log spread |
| Node lost | timer fail | still open | setProp node down, addVar breach by fail penalty |
| Loss | varChanged breach | varGt breach 99 | lose, changeScene report |
| Win | timer shift | varLt breach 100 | win, changeScene report |
| HUD | — | — | bar for breach and budget, text for clock, uptime, threat |
| Report | enterScene report | — | modal plus table of stopped, spawned, wrong |

## Screens

1. Title. Name, one sentence, button into the briefing.
2. Briefing. Three cards: the map shows the company, the log tells you the haunting, one response is correct. Button: Begin shift.
3. Floor. Top: clock, budget, breach, threat, uptime. Left or center: the eight nodes and their links. Side: the log. Side: the five response buttons, enabled only when a haunted node is selected and the budget can pay.
4. Report. Win or lose in one line. Stopped, spawned, wrong. Button back to title.

## Gaps

File these on ReForge-Engine only after CONTRACT.md exists. Title them like this, not "CyberOps needs this."

1. Draw linked entities as a graph and color each one from a status property.
2. Select one entity and apply the next action only to that entity.
3. Append a line to a log widget.
4. Start a timer on one entity, pause its meter while the timer runs, then compare a chosen id with a property on that entity.
5. Spawn from a weighted table onto one of a listed host, skipping hosts that are already occupied, with a cap on living entities.
6. Show a bar bound to a variable, and a modal table of counters at the end of a scene.

Until those exist, `game.json` still stores the numbers and the log text. Do not invent a second engine in this folder.