import { UAttribute } from "./attribute";

export class UField {
  private _name: string;
  private _type?: string;
  private _attributes: UAttribute<any>[] = [];
  constructor(name: string, type?: string) {
    this._name = name;
    this._type = type;
  }

  $name() {
    return this._name;
  }

  $type() {
    return this._type;
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
    this.remove(attributes);
    this._attributes = this._attributes.concat(attributes);
    return this;
  }

  extends(field: UField) {
    if (!this._type) this._type = field._type;
    return this.attributes(field.$attributes());
  }

  remove(attributes: UAttribute<any>[]) {
    this._attributes = this._attributes.filter(
      (attribute) => !attributes.some((a) => a.$name() == attribute.$name())
    );
    return this;
  }
}
