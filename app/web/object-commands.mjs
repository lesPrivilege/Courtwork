/* Object Command grammar (object-command-grammar-20260914) · one descriptor
 * set for the actions on a Chat row and a Project row, wherever the row is
 * drawn (Recent, a Project's list) and however it is asked (secondary click,
 * the row's More button, the keyboard's Menu key). The menu is a projection:
 * the owner of each action is the Host route or the app state it already
 * has, and the registry here confers nothing — `when` says whether a command
 * is drawn for this target at all (no capability → not drawn; no Planned
 * rows), `enablement` says whether it can run now and why not. Both are
 * re-evaluated when the command is invoked, on a context resolved at that
 * moment: a menu opened a while ago is not evidence. */
import { semanticPresentation } from "./semantic-controls.mjs";

export const COMMAND_GROUPS = Object.freeze(["navigation", "organization", "lifecycle", "interop", "destructive"]);
const ok = Object.freeze({ enabled: true });

export const OBJECT_COMMANDS = Object.freeze([
  Object.freeze({
    id: "chat.open", semanticKey: "chat.open", targetKinds: ["chat"], group: "navigation", destructive: false,
    /* Example rows have no menu at all (grammar: fixture and real objects
     * share no command set); the row's own click still opens them. */
    when: (context) => !context.target.preview,
    enablement: (context) => context.target.id === context.activeSessionId && context.view === "session"
      ? { enabled: false, reason: "This chat is already open." } : ok,
    execute: (context, handlers) => handlers.open(context.target),
  }),
  Object.freeze({
    id: "chat.rename", semanticKey: "chat.rename", targetKinds: ["chat"], group: "organization", destructive: false,
    when: (context) => !context.target.preview,
    enablement: () => ok,
    execute: (context, handlers) => handlers.rename(context.target),
  }),
  Object.freeze({
    id: "project.new-chat", semanticKey: "chat.create", targetKinds: ["project"], group: "organization", destructive: false,
    values: (context) => ({ context: ` in ${context.target.title}` }),
    when: (context) => !context.target.preview,
    enablement: (context) => context.startPending ? { enabled: false, reason: "Finish or recover the chat being started first." } : ok,
    execute: (context, handlers) => handlers.newChat(context.target),
  }),
  Object.freeze({
    /* The Host removes the catalog record and keeps the workspace bytes; it
     * refuses while a Run is active (409 active_run). The row says so before
     * asking, the confirmation says what is kept. */
    id: "chat.delete", semanticKey: "chat.delete", targetKinds: ["chat"], group: "destructive", destructive: true,
    when: (context) => !context.target.preview,
    enablement: (context) => context.target.activeRun ? { enabled: false, reason: "Unavailable while a Run is active." } : ok,
    execute: (context, handlers) => handlers.delete(context.target),
  }),
]);

export function findCommand(id) {
  return OBJECT_COMMANDS.find((command) => command.id === id) ?? null;
}

/** The commands drawn for a resolved context, in registry order, each with
 * its label and glyph from the semantic registry and its current enablement. */
export function commandsFor(context) {
  if (!context?.target?.kind) return [];
  return OBJECT_COMMANDS
    .filter((command) => command.targetKinds.includes(context.target.kind) && command.when(context))
    .map((command) => {
      const { entry, label, glyph } = semanticPresentation(command.semanticKey, { values: command.values?.(context) ?? {} });
      const enablement = command.enablement(context);
      /* `word` is what the row shows (the menu already names its target);
       * `label` is the full accessible name from the same registry entry. */
      return { id: command.id, semanticKey: command.semanticKey, word: entry.words.en, label, glyph, group: command.group,
        destructive: command.destructive, enabled: enablement.enabled, reason: enablement.enabled ? null : enablement.reason };
    });
}

/** Groups in the fixed order, empty groups dropped, destructive last. */
export function groupCommands(commands) {
  return COMMAND_GROUPS.map((group) => commands.filter((command) => command.group === group)).filter((group) => group.length);
}

/**
 * The dispatcher every entry point shares. `resolve(ref)` turns a target
 * reference ({kind, id}) into the current context, or null when the object
 * is gone; `handlers` are the real executors the app owns.
 */
export function createCommandDispatcher({ resolve, handlers }) {
  return {
    list(ref) {
      const context = resolve(ref);
      return context ? commandsFor(context) : [];
    },
    async run(id, ref) {
      const context = resolve(ref);
      if (!context) return { state: "unavailable", reason: "This item is no longer available." };
      const command = findCommand(id);
      if (!command || !command.targetKinds.includes(context.target.kind) || !command.when(context))
        return { state: "unavailable", reason: "This action is not available for this item." };
      const enablement = command.enablement(context);
      if (!enablement.enabled) return { state: "disabled", reason: enablement.reason };
      await command.execute(context, handlers);
      return { state: "done" };
    },
  };
}
