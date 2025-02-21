import path from "path";
import {
  RendererFileInput,
  RendererOutput,
  RendererSelection,
} from "../types/renderer";
import { Seed } from "./seed";
import { Model } from "./model";
import { $attr } from "../shortcuts/queries";
import { ref } from "../shortcuts/attributes";
import { Module } from "./module";

export class Renderer {
  constructor() {}

  findModels(seed: Seed, where?: (module: Module, model: Model) => boolean) {
    const modules = seed.$moduleList();
    const models: { model: Model; module: Module }[] = [];

    modules.forEach((mod) => {
      let foundModels: Model[] = [];
      mod.$featureList().forEach((feature) => {
        const root: Model[] = [];
        if (feature.$input()) root.push(feature.$input() as Model);
        if (feature.$output()) root.push(feature.$output() as Model);

        const deepSearch = (model: Model) => {
          if (
            !foundModels.some((m) => m.$name() == model.$name()) &&
            !models.some((m) => m.model.$name() == model.$name())
          ) {
            foundModels.push(model);
            model.$fieldList().forEach((field) => {
              if (field.$type() == "nested") {
                const nestedModel = $attr(field, ref());
                if (nestedModel) deepSearch(nestedModel);
              }
            });
          }
        };
        root.forEach(deepSearch);
      });

      if (where) foundModels = foundModels.filter((model) => where(mod, model));
      models.push(...foundModels.map((model) => ({ model, module: mod })));
    });

    return models;
  }

  async select(seed: Seed): Promise<RendererSelection> {
    return { modules: seed.$moduleList() };
  }

  async render(
    seed: Seed,
    selection: RendererSelection,
    files: RendererFileInput
  ): Promise<RendererOutput> {
    return {};
  }
}
