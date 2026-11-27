# Behavior catalog

Generated from the engine registry (engine 0.1.0) by `pnpm -F engine gen`. Do not edit by hand.

## Events (`when`)

| Name | What it does | Parameters |
| --- | --- | --- |
| `click` | Something is clicked. A UI button (by its id) or an entity in the world (by id, type or tag). With no target, any world click. | `target` (string): A button id, entity id, entity type or tag. Leave empty for any world click. |
| `collide` | Two things touch. Fires once when A and B start touching. In the rule, self is A and other is B. | `a` (string, required): Entity type, id or tag.<br>`b` (string, required): Entity type, id or tag. |
| `custom` | A custom signal. Fires when an `emit` action sends this name. | `name` (string, required) |
| `died` | Something runs out of health | `target` (string): Entity type, id or tag. Empty = anything. |
| `enterScene` | A scene loads | `scene` (scene): Leave empty for any scene. |
| `key` | Key is pressed. A keyboard key, by name (Space, Enter, KeyE, ArrowUp, ...). | `key` (string, required, default `"Space"`)<br>`mode` (select, default `"pressed"`, one of `pressed`, `down`, `released`): pressed = the moment it goes down, down = every tick while held. |
| `start` | Game starts. Fires once, right after the first scene loads (and again after a restart). | none |
| `tick` | Every tick. Fires 60 times a second. Use sparingly; timers are usually better. | none |
| `timer` | A timer finishes. Fires when a timer started with the startTimer action runs out. | `id` (string, required) |
| `varChanged` | A variable changes | `var` (variable, required) |

## Conditions (`if`)

| Name | What it does | Parameters |
| --- | --- | --- |
| `compare` | Compare two values. Either side can be a number, text, or a $reference such as $var.hp, $self.row.correct or $timer.answer. | `left` (string, required)<br>`op` (select, required, default `"=="`, one of `==`, `!=`, `<`, `<=`, `>`, `>=`)<br>`right` (string, required) |
| `entityCount` | Number of entities | `match` (string, required): Entity type, id or tag.<br>`min` (number, range 0–…)<br>`max` (number, range 0–…) |
| `hasItem` | Has item. True when the target's inventory holds at least `count` of the item. | `item` (string, required)<br>`count` (number, default `1`, range 1–…)<br>`target` (target, default `"self"`): self, other, selected, an id, type or tag. |
| `hasSelection` | Something is selected | none |
| `hasTag` | Has tag | `target` (target, default `"self"`)<br>`tag` (tag, required) |
| `inScene` | Current scene is | `scene` (scene, required) |
| `random` | Random chance | `chance` (number, required, default `0.5`, range 0–1) |
| `tagNear` | A tagged entity is nearby | `tag` (tag, required)<br>`distance` (number, required, default `32`, range 0–…)<br>`of` (target, default `"self"`) |
| `timerRunning` | A timer is running | `id` (string, required)<br>`target` (target): Leave empty for any owner. |
| `varEq` | Variable equals | `var` (variable, required)<br>`value` (string, required) |
| `varGt` | Variable is greater than | `var` (variable, required)<br>`value` (number, required, default `0`) |
| `varLt` | Variable is less than | `var` (variable, required)<br>`value` (number, required, default `0`) |

## Actions (`then`)

| Name | What it does | Parameters |
| --- | --- | --- |
| `addTag` | Add tag | `target` (target, default `"self"`): self, other, selected, an id, an entity type or a tag.<br>`tag` (tag, required) |
| `addVar` | Add to variable | `var` (variable, required)<br>`by` (number, required, default `1`): Negative to subtract.<br>`min` (number)<br>`max` (number) |
| `changeScene` | Go to scene | `scene` (scene, required) |
| `clearSelection` | Clear selection | none |
| `closePanel` | Close panel | `id` (string, required) |
| `damage` | Hurt | `target` (target, default `"self"`): self, other, selected, an id, an entity type or a tag.<br>`amount` (number, required, default `1`, range 0–…) |
| `destroy` | Remove entity | `target` (target, default `"self"`): self, other, selected, an id, an entity type or a tag. |
| `emit` | Send a custom signal | `name` (string, required) |
| `forEach` | For each matching entity. Runs the nested actions once per matching entity, with self set to that entity. Optional conditions filter. | `target` (string, required): self, other, selected, an id, an entity type or a tag. |
| `giveItem` | Give item | `item` (string, required)<br>`count` (number, default `1`)<br>`target` (target, default `"self"`): self, other, selected, an id, an entity type or a tag. |
| `heal` | Heal | `target` (target, default `"self"`): self, other, selected, an id, an entity type or a tag.<br>`amount` (number, required, default `1`, range 0–…) |
| `log` | Add to log. Appends a line to a log/list widget. With `lines` (a list, or a list of lists with `pick`), appends each line. | `text` (string)<br>`lines` (string): A $reference to a list of lines.<br>`pick` (boolean, default `false`)<br>`to` (string, default `"log"`) |
| `lose` | Lose the game | none |
| `move` | Move entity | `target` (target, default `"self"`): self, other, selected, an id, an entity type or a tag.<br>`dx` (number, default `0`)<br>`dy` (number, default `0`)<br>`x` (number)<br>`y` (number) |
| `openPanel` | Open panel | `id` (string, required) |
| `playSound` | Play sound. Emits a `sound` event for the page to play. The engine ships no audio. | `sound` (asset, required) |
| `removeTag` | Remove tag | `target` (target, default `"self"`): self, other, selected, an id, an entity type or a tag.<br>`tag` (tag, required) |
| `selectEntity` | Select entity. Marks one entity as selected (tag `selected`). Later actions can target `selected`. | `target` (target, default `"self"`): self, other, selected, an id, an entity type or a tag. |
| `setProp` | Set property. Sets a value on an entity. `status` sets props.status; `health.hp` sets a component field. | `target` (target, default `"self"`): self, other, selected, an id, an entity type or a tag.<br>`prop` (string, required)<br>`value` (string, required) |
| `setVar` | Set variable | `var` (variable, required)<br>`value` (string, required): A number, text, true/false, or a $reference. |
| `showText` | Show a message | `text` (string, required) |
| `spawn` | Create an entity | `type` (entityType, required)<br>`x` (number, default `0`)<br>`y` (number, default `0`)<br>`at` (target): Put it where this entity is (then X and Y are offsets). |
| `spawnFromTable` | Place a table row on a free host. Picks a row from a table (by id, or weighted random), finds a free host entity from the row's host list, marks it, and stores the row on it as `row`. Fires a `spawned` custom signal on the host. | `table` (string, required)<br>`id` (string): Leave empty for a weighted random row.<br>`host` (string): Leave empty to choose from the row's host list.<br>`hostsField` (string, default `"hosts"`)<br>`markTag` (tag, default `"occupied"`)<br>`status` (string)<br>`maxActive` (number, range 0–…)<br>`countVar` (variable) |
| `startTimer` | Start a timer. When it runs out, a `timer` event with this id fires. Give it a target to attach it to one entity. | `id` (string, required)<br>`seconds` (number, required, default `1`, range 0.02–…)<br>`target` (target): Leave empty for a global timer.<br>`repeat` (boolean, default `false`)<br>`data` (string): Optional values handed to the rule as $timer.name. |
| `stopTimer` | Stop a timer | `id` (string, required)<br>`target` (target) |
| `takeItem` | Take item | `item` (string, required)<br>`count` (number, default `1`)<br>`target` (target, default `"self"`): self, other, selected, an id, an entity type or a tag. |
| `win` | Win the game | none |

## Components

| Name | What it does | Parameters |
| --- | --- | --- |
| `ai` | AI movement | `mode` (select, default `"chase"`, one of `chase`, `patrol`, `flee`)<br>`speed` (number, required, default `40`, range 0–…)<br>`target` (tag, default `"player"`): Chase or flee from entities with this tag.<br>`range` (number, range 0–…): Empty = unlimited. |
| `collider` | Collider (touch box) | `w` (number, required, default `16`, range 0–…)<br>`h` (number, required, default `16`, range 0–…)<br>`solid` (boolean, default `false`) |
| `health` | Health | `max` (number, required, default `10`, range 1–…)<br>`hp` (number): Defaults to the maximum. |
| `inventory` | Inventory. Holds item counts; created automatically by giveItem. | none |
| `label` | Text label | `text` (string): Defaults to the instance's `name`. |
| `mover` | Mover (keyboard) | `mode` (select, default `"topdown"`, one of `topdown`)<br>`speed` (number, required, default `90`, range 0–…) |
| `node` | Graph node. Draws links to other entities listed in the instance's `links` and colors itself by `status`. | `status` (string, default `"healthy"`): healthy, haunted, working, lost, or your own. |
| `shape` | Shape (colored box or circle) | `kind` (select, default `"rect"`, one of `rect`, `circle`)<br>`color` (color, default `"#8aa384"`)<br>`w` (number, required, default `16`, range 1–…)<br>`h` (number, required, default `16`, range 1–…)<br>`layer` (number, default `0`) |
| `sprite` | Sprite (image) | `image` (asset, required)<br>`w` (number, required, default `16`, range 1–…)<br>`h` (number, required, default `16`, range 1–…)<br>`cols` (number, default `1`, range 1–…)<br>`rows` (number, default `1`, range 1–…)<br>`frame` (number, default `0`, range 0–…)<br>`layer` (number, default `0`) |
| `tags` | Tags. Tags live on the entity (type `tags` plus instance `tags`). | none |

## UI widgets

| Name | What it does | Parameters |
| --- | --- | --- |
| `bar` | Progress bar. Fills in proportion to a variable. | `var` (variable, required)<br>`max` (number, required, default `100`, range 1–…)<br>`label` (string)<br>`color` (color)<br>`id` (string): Optional id.<br>`scene` (scene): Show this widget only while this scene is active. Leave empty to show it in every scene.<br>`pos` (select, default `"top-left"`, one of `top-left`, `top`, `top-right`, `left`, `center`, `right`, `bottom-left`, `bottom`, `bottom-right`): Where on the screen the widget sits. Widgets in the same position stack. |
| `button` | Button. Raises a click event with its id when pressed. | `id` (string, required): Used by rules: when click target = this id.<br>`label` (string, required, default `"Button"`)<br>`scene` (scene): Show this widget only while this scene is active. Leave empty to show it in every scene.<br>`pos` (select, default `"top-left"`, one of `top-left`, `top`, `top-right`, `left`, `center`, `right`, `bottom-left`, `bottom`, `bottom-right`): Where on the screen the widget sits. Widgets in the same position stack. |
| `list` | List. Scrolling lines of text, newest at the bottom. | `id` (string, required): Used by the log action.<br>`label` (string)<br>`scene` (scene): Show this widget only while this scene is active. Leave empty to show it in every scene.<br>`pos` (select, default `"top-left"`, one of `top-left`, `top`, `top-right`, `left`, `center`, `right`, `bottom-left`, `bottom`, `bottom-right`): Where on the screen the widget sits. Widgets in the same position stack. |
| `log` | Log. Scrolling lines of text, newest at the bottom. | `id` (string, required): Used by the log action.<br>`label` (string)<br>`scene` (scene): Show this widget only while this scene is active. Leave empty to show it in every scene.<br>`pos` (select, default `"top-left"`, one of `top-left`, `top`, `top-right`, `left`, `center`, `right`, `bottom-left`, `bottom`, `bottom-right`): Where on the screen the widget sits. Widgets in the same position stack. |
| `modal` | Modal. A centered box over a dimmed screen, visible while it is open. | `id` (string, required): Used by openPanel and closePanel.<br>`title` (string)<br>`text` (string): Use {name} to insert a variable.<br>`open` (boolean, default `false`): Show whenever its scene is active, without an open action.<br>`scene` (scene): Show this widget only while this scene is active. Leave empty to show it in every scene. |
| `panel` | Panel. A box that is visible while it is open. | `id` (string, required): Used by openPanel and closePanel.<br>`title` (string)<br>`text` (string): Use {name} to insert a variable.<br>`open` (boolean, default `false`): Show whenever its scene is active, without an open action.<br>`scene` (scene): Show this widget only while this scene is active. Leave empty to show it in every scene.<br>`pos` (select, default `"top-left"`, one of `top-left`, `top`, `top-right`, `left`, `center`, `right`, `bottom-left`, `bottom`, `bottom-right`): Where on the screen the widget sits. Widgets in the same position stack. |
| `table` | Table. A name and value row for each listed variable. | `vars` (variable, required): The variables to list. Stored as a list of names.<br>`title` (string)<br>`id` (string): Optional id.<br>`scene` (scene): Show this widget only while this scene is active. Leave empty to show it in every scene.<br>`pos` (select, default `"top-left"`, one of `top-left`, `top`, `top-right`, `left`, `center`, `right`, `bottom-left`, `bottom`, `bottom-right`): Where on the screen the widget sits. Widgets in the same position stack. |
| `text` | Text. Static text, or a variable shown as 'Label: value'. | `text` (string): Use {name} to insert a variable.<br>`var` (variable)<br>`label` (string)<br>`id` (string): Optional id.<br>`scene` (scene): Show this widget only while this scene is active. Leave empty to show it in every scene.<br>`pos` (select, default `"top-left"`, one of `top-left`, `top`, `top-right`, `left`, `center`, `right`, `bottom-left`, `bottom`, `bottom-right`): Where on the screen the widget sits. Widgets in the same position stack. |
