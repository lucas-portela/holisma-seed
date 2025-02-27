import { RenderContent, RenderPath, RenderSelection } from "../types/renderer";
import { UDraft } from "./seed";
import { UModel } from "./model";
import { $attr } from "../shortcuts/queries";
import { _ref, _rootModule } from "../shortcuts/attributes";
import { UModule } from "./module";
import { UFeature } from "./feature";

export class URenderer {
  private _seed?: UDraft;
  private _selection: RenderSelection = {};
  private _contents: RenderContent[] = [];
  private _outputs: RenderContent[] = [];

  constructor() {}

  $seed() {
    return this._seed as UDraft;
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

  $features(where?: (module: UModule, feature: UFeature) => boolean) {
    const modules = this.$seed().$moduleList();
    const features: { feature: UFeature; module: UModule }[] = [];

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

  $models(where?: (module: UModule, model: UModel) => boolean) {
    const modules = this.$seed().$moduleList();
    let models: { model: UModel; module: UModule }[] = [];

    modules.forEach((mod) => {
      let foundModels: UModel[] = [];
      mod.$featureList().forEach((feature) => {
        const root: UModel[] = [];
        if (feature.$input()) root.push(feature.$input() as UModel);
        if (feature.$output()) root.push(feature.$output() as UModel);

        const modelIsAlreadyRegistered = (model: UModel) =>
          foundModels.some((m) => m.$name() == model.$name()) ||
          models.some((m) => m.model.$name() == model.$name());

        const deepSearch = (model: UModel) => {
          const modelRootModule = $attr(model, _rootModule());
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
                const nestedModel = $attr(field, _ref());
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

  async init(seed: UDraft) {
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
