# Requirements

## Shift

1. When the player starts a full shift, the system shall set the clock to 0, the budget to 560, and the breach meter to 4.
2. When the shift begins, the system shall open a phishing haunting on Desk A and show its log lines.
3. While the shift is running, the system shall advance the clock and raise breach for every open haunting.
4. When the clock reaches 180 seconds and breach is below 100, the system shall end the shift as a win.
5. When breach reaches 100, the system shall end the shift as a loss.
6. While a shift is running, the system shall keep at most 2 open hauntings before 55 seconds, and at most 3 after that.
7. When a new haunting is due, the system shall pick one from the weighted table and place it on an allowed node that is not already haunted or lost.

## Investigation

8. When the player selects a node, the system shall show that node's log if it is haunted.
9. When the player picks a response and the budget is high enough, the system shall subtract that response's cost and start its timer.
10. When the budget is too low, the system shall refuse the response and leave the haunting open.
11. When a response timer finishes and the response is the one correct response for that haunting, the system shall clear the node and subtract 5 from breach.
12. When a response timer finishes and the response is wrong, the system shall add that haunting's wrong penalty and leave the node haunted.
13. When an open haunting reaches its slow time, the system shall add the slow penalty once.
14. When an open haunting reaches its fail time, the system shall mark that node lost and add the fail penalty.

## Presentation

15. While a shift is running, the system shall show budget, breach, threat, uptime, and the clock.
16. When the shift ends, the system shall show how many hauntings were stopped, how many spawned, and how many wrong responses were used.
17. When the player is on the briefing, the system shall explain the map, the log, and that only one response is correct, before the shift starts.
18. The system shall let a player who has never seen the game finish a 3-minute shift using only the on-screen text.

## Data

19. The system shall load the shift only from `cyberops/game.json` and `cyberops/theme.css`.
20. The system shall not require custom gameplay code in this folder.