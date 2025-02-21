import { Attribute } from "./attribute";

export class Field {
  private _name: string;
  private _type?: string;
  private _attributes: Attribute<any>[] = [];
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
    this.remove(attributes);
    this._attributes = this._attributes.concat(attributes);
    return this;
  }

  extends(field: Field) {
    if (!this._type) this._type = field._type;
    return this.attributes(field.$attributeList());
  }

  remove(attributes: Attribute<any>[]) {
    this._attributes = this._attributes.filter(
      (attribute) => !attributes.some((a) => a.$name() == attribute.$name())
    );
    return this;
  }
}
