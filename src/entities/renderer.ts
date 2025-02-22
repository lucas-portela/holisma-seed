import { RenderContent, RenderPath, RenderSelection } from "../types/renderer";
import { Seed } from "./seed";
import { Model } from "./model";
import { $attr } from "../shortcuts/queries";
import { ref, rootModule } from "../shortcuts/attributes";
import { Module } from "./module";
import { Feature } from "./feature";

export class Renderer {
  private _seed?: Seed;
  private _selection: RenderSelection = {};
  private _contents: RenderContent[] = [];
  private _outputs: RenderContent[] = [];

  constructor() {}

  $seed() {
    return this._seed as Seed;
  }

  $selection() {
    return this._selection;
  }

  $pathList() {
    return this._selection.paths || [];
  }

  $contentList() {
    return this._contents;
  }

  $outputList() {
    return this._outputs;
  }

  $path(key: string) {
    return this.$pathList().find((f) => f.key == key) || null;
  }

  $content(key: string) {
    return this.$contentList().find((f) => f.key == key) || null;
  }

  $output(key: string) {
    return this.$outputList().find((f) => f.key == key) || null;
  }

  $features(where?: (module: Module, feature: Feature) => boolean) {
    const modules = this.$seed().$moduleList();
    const features: { feature: Feature; module: Module }[] = [];

    modules.forEach((mod) => {
      let foundFeatures = mod.$featureList();
      if (where)
        foundFeatures = foundFeatures.filter((feature) => where(mod, feature));
      features.push(
        ...foundFeatures.map((feature) => ({ feature, module: mod }))
      );
    });

    return features;
  }

  $models(where?: (module: Module, model: Model) => boolean) {
    const modules = this.$seed().$moduleList();
    let models: { model: Model; module: Module }[] = [];

    modules.forEach((mod) => {
      let foundModels: Model[] = [];
      mod.$featureList().forEach((feature) => {
        const root: Model[] = [];
        if (feature.$input()) root.push(feature.$input() as Model);
        if (feature.$output()) root.push(feature.$output() as Model);

        const modelIsAlreadyRegistered = (model: Model) =>
          foundModels.some((m) => m.$name() == model.$name()) ||
          models.some((m) => m.model.$name() == model.$name());

        const deepSearch = (model: Model) => {
          const modelRootModule = $attr(model, rootModule());
          const isAlreadyRegistered = modelIsAlreadyRegistered(model);
          if (
            !isAlreadyRegistered ||
            (modelRootModule && modelRootModule.$name() == mod.$name())
          ) {
            if (isAlreadyRegistered) {
              foundModels = foundModels.filter(
                (m) => m.$name() != model.$name()
              );
              models = models.filter((m) => m.model.$name() != model.$name());
            }
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

  async init(seed: Seed) {
    this._seed = seed;
    this._selection = await this.select();
    return this;
  }

  async run(contents: RenderContent[]) {
    this._contents = contents;
    this._outputs = await this.render();
    this._outputs.forEach((output) => {
      output.meta = this.$content(output.key)?.meta || {};
    });
    return this;
  }

  async select(): Promise<RenderSelection> {
    return {};
  }

  async render(): Promise<RenderContent[]> {
    return [];
  }

  clear() {
    this._seed = undefined;
    this._selection = {};
    this._contents = [];
    this._outputs = [];
  }
}
