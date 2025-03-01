import { _rootModule } from "../shortcuts/attributes";
import { $attr } from "../shortcuts/queries";
import { UAttribute } from "./attribute";
import { UFeature } from "./feature";
import { UModel } from "./model";

export class UModule {
  private _name: string;
  private _features: UFeature[] = [];
  private _models: UModel[] = [];
  private _attributes: UAttribute<any>[] = [];

  constructor(name: string) {
    this._name = name;
  }

  $name() {
    return this._name;
  }

  $features(features?: (UFeature | string)[]) {
    if (features) {
      const featureNames = features.map((f) =>
        typeof f === "string" ? f : f.$name()
      );
      return this._features.filter((f) => featureNames.includes(f.$name()));
    }
    return [...this._features];
  }

  $models(models?: (UModel | string)[]) {
    if (models) {
      const modelNames = models.map((model) =>
        typeof model === "string" ? model : model.$name()
      );
      return this._models.filter((f) => modelNames.includes(f.$name()));
    }
    return [...this._models];
  }

  $attributes() {
    return [...this._attributes];
  }

  $attribute<Type>(attribute: UAttribute<Type>) {
    const a = this._attributes.find(
      (attr) => attr.$name() == attribute.$name()
    );
    return a ? a : attribute;
  }

  $attributeValue(name: string) {
    const a = this._attributes.find((attr) => attr.$name() == name);
    return a ? a.$value() : undefined;
  }

  $where(clause: (module: UFeature) => boolean) {
    return this._features.filter(clause);
  }

  attributes(attributes: UAttribute<any>[]) {
    this.removeAttributes(attributes);
    this._attributes = this._attributes.concat(attributes);
    return this;
  }

  models(models: UModel[]) {
    this.removeModels(models);
    this._models = this._models.concat(models);
    this._models.forEach((model) => {
      model.attributes([_rootModule(this)]);
    });
    return this;
  }

  features(features: UFeature[]) {
    this.remove(features);
    this._features = this._features.concat(features);
    this._features.forEach((feature) => {
      feature.attributes([_rootModule(this)]);
    });
    return this;
  }

  remove(features: UFeature[]) {
    this._features = this._features.filter(
      (feature) => !features.some((m) => m.$name() === feature.$name())
    );
    return this;
  }

  removeAttributes(attributes: UAttribute<any>[]) {
    this._attributes = this._attributes.filter(
      (attribute) => !attributes.some((a) => a.$name() == attribute.$name())
    );
    return this;
  }

  removeModels(models: UModel[]) {
    this._models = this._models.filter(
      (model) => !models.some((m) => m.$name() == model.$name())
    );
    return this;
  }
}
