import { UAttribute } from "./attribute";
import { UModel } from "./model";

export class UFeature {
  private _name: string;
  private _input?: UModel;
  private _output?: UModel;
  private _attributes: UAttribute<any>[] = [];

  constructor(name: string) {
    this._name = name;
  }

  $name() {
    return this._name;
  }

  $attribute<Type>(attribute: UAttribute<Type>) {
    const a = this._attributes.find(
      (attr) => attr.$name() == attribute.$name()
    );
    return a ? a : attribute;
  }

  $attributes() {
    return [...this._attributes];
  }

  attributes(attributes: UAttribute<any>[]) {
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

  input(model: UModel) {
    this._input = model;
    return this;
  }

  output(model: UModel) {
    this._output = model;
    return this;
  }

  removeAttributes(attributes: UAttribute<any>[]) {
    this._attributes = this._attributes.filter(
      (attribute) => !attributes.some((a) => a.$name() == attribute.$name())
    );
    return this;
  }
}
