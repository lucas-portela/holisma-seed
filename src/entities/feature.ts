import { Attribute } from "./attribute";
import { Model } from "./model";

export class Feature {
  private _name: string;
  private _input?: Model;
  private _output?: Model;
  private _attributes: Attribute<any>[] = [];

  constructor(name: string) {
    this._name = name;
  }

  $name() {
    return this._name;
  }

  $attribute<Type>(attribute: Attribute<Type>) {
    const a = this._attributes.find(
      (attr) => attr.$name() == attribute.$name()
    );
    return a ? a : attribute;
  }

  $attributeList() {
    return this._attributes;
  }

  attributes(attributes: Attribute<any>[]) {
    this.removeAttributes(attributes);
    this._attributes = this._attributes.concat(attributes);
    return this;
  }

  $input() {
    return this._input;
  }

  $output() {
    return this._output;
  }

  extends(feature: Feature) {
    this.attributes(feature.$attributeList());
    if (feature._input) this.input(feature._input);
    if (feature._output) this.output(feature._output);
    return this;
  }

  input(model: Model) {
    this._input = model;
    return this;
  }

  output(model: Model) {
    this._output = model;
    return this;
  }

  removeAttributes(attributes: Attribute<any>[]) {
    this._attributes = this._attributes.filter(
      (attribute) => !attributes.some((a) => a.$name() == attribute.$name())
    );
    return this;
  }
}
