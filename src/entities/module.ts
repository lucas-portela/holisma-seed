import { Attribute } from "./attribute";
import { Feature } from "./feature";

export class Module {
  private _name: string;
  private _features: Feature[] = [];
  private _attributes: Attribute<any>[] = [];

  constructor(name: string) {
    this._name = name;
  }

  $name() {
    return this._name;
  }

  $featureList() {
    return this._features;
  }

  $attribute<Type>(attribute: Attribute<Type>) {
    const a = this._attributes.find(
      (attr) => attr.$name() == attribute.$name()
    );
    return a ? a : attribute;
  }

  $attributeValue(name: string) {
    const a = this._attributes.find((attr) => attr.$name() == name);
    return a ? a.$value() : undefined;
  }

  $attributeList() {
    return this._attributes;
  }

  $where(clause: (module: Feature) => boolean) {
    return this._features.filter(clause);
  }

  attributes(attributes: Attribute<any>[]) {
    this.removeAttributes(attributes);
    this._attributes = this._attributes.concat(attributes);
    return this;
  }

  features(features: Feature[]) {
    this.remove(features);
    this._features = this._features.concat(features);
    return this;
  }

  extends(module: Module) {
    return this.features(module.$featureList()).attributes(
      module.$attributeList()
    );
  }

  remove(features: Feature[]) {
    this._features = this._features.filter(
      (feature) => !features.some((m) => m.$name() === feature.$name())
    );
    return this;
  }

  removeAttributes(attributes: Attribute<any>[]) {
    this._attributes = this._attributes.filter(
      (attribute) => !attributes.some((a) => a.$name() == attribute.$name())
    );
    return this;
  }
}
