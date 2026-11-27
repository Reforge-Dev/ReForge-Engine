import { Registry } from "../core/registry";
import { widgetDefs } from "../ui/index";
import { actions } from "./actions";
import { components } from "./components";
import { conditions } from "./conditions";
import { events } from "./events";

/** A fresh registry with every built-in behavior. Instances, not a module global, so tests stay isolated. */
export function createRegistry(): Registry {
  const registry = new Registry();
  for (const d of events) registry.registerEvent(d);
  for (const d of conditions) registry.registerCondition(d);
  for (const d of actions) registry.registerAction(d);
  for (const d of components) registry.registerComponent(d);
  for (const d of widgetDefs) registry.registerWidget(d);
  return registry;
}

/** The default registry used by createGame. Treat as read-only. */
export const registry: Registry = createRegistry();
