import type { Renderer, ViewModel } from "./viewModel.js";

/** A renderer that stores a deep copy of every model it receives, in order. */
export function createRecordingRenderer(): Renderer & {
  models: ViewModel[];
  last(): ViewModel;
} {
  const models: ViewModel[] = [];
  return {
    models,
    render(model) {
      models.push(structuredClone(model));
    },
    last() {
      const model = models.at(-1);
      if (model === undefined) throw new Error("nothing was rendered");
      return model;
    },
  };
}
