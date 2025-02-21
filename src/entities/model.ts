import { model } from "../shortcuts/entities";
import { Attribute } from "./attribute";
import { Field } from "./field";

export class Model {
  private _name: string;
  private _fields: Field[] = [];
  private _attributes: Attribute<any>[] = [];

  constructor(name: string) {
    this._name = name;
  }

  $name() {
    return this._name;
  }

  $field(field: Field) {
    const f = this._fields.find((f) => f.$name() == field.$name());
    return f ? f : field;
  }

  $fieldList() {
    return this._fields;
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

  name(name: string) {
    this._name = name;
    return this;
  }

  fields(fields: Field[]) {
    this.remove(fields);
    this._fields = this._fields.concat(fields);
    return this;
  }

  extends(model: Model) {
    return this.fields(model.$fieldList()).attributes(model.$attributeList());
  }

  remove(fields: Field[]) {
    this._fields = this._fields.filter(
      (field) => !fields.some((f) => f.$name() == field.$name())
    );
    return this;
  }

  pick(name: string, fields: Field[]) {
    const picked = this._fields.filter((field) =>
      fields.some((f) => f.$name() == field.$name())
    );

    return model(name).fields(picked);
  }

  removeAttributes(attributes: Attribute<any>[]) {
    this._attributes = this._attributes.filter(
      (attribute) => !attributes.some((a) => a.$name() == attribute.$name())
    );
    return this;
  }
}
