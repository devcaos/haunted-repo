import {
  isAvailable,
  type ActionSink,
  type UserAction,
} from "../../../logic/actions.js";
import type { ViewModel } from "../../../logic/viewModel.js";

export interface ActionGuard {
  setModel(model: ViewModel): void;
  current(): ViewModel | null;
  /** Forwards the action only when a model exists and isAvailable(model, action). Returns whether it was sent. */
  send(action: UserAction): boolean;
}

/**
 * Every control, timer and Reaction of the Scenic_Renderer sends through this
 * guard, so a stale control can never dispatch an action that the newest model
 * does not offer (Requirements 2.7, 2.8).
 */
export function createActionGuard(onAction: ActionSink): ActionGuard {
  let model: ViewModel | null = null;
  return {
    setModel(next: ViewModel): void {
      model = next;
    },
    current(): ViewModel | null {
      return model;
    },
    send(action: UserAction): boolean {
      if (model === null || !isAvailable(model, action)) return false;
      onAction(action);
      return true;
    },
  };
}
