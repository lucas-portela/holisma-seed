import { uModel } from "../shortcuts/entities";
import { UAttribute } from "./attribute";
import { UField } from "./field";

export class UModel {
  private _name: string;
  private _fields: UField[] = [];
  private _attributes: UAttribute<any>[] = [];

  constructor(name: string) {
    this._name = name;
  }

  $name() {
    return this._name;
  }

  $field(field: UField) {
    const f = this._fields.find((f) => f.$name() == field.$name());
    return f ? f : field;
  }

  $fields() {
    return [...this._fields];
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

  name(name: string) {
    this._name = name;
    return this;
  }

  fields(fields: UField[]) {
    this.remove(fields);
    this._fields = this._fields.concat(fields);
    return this;
  }

  extends(model: UModel) {
    return this.fields(model.$fields()).attributes(model.$attributes());
  }

  remove(fields: UField[]) {
    this._fields = this._fields.filter(
      (field) => !fields.some((f) => f.$name() == field.$name())
    );
    return this;
  }

  pick(name: string, fields: (UField | string)[]) {
    const picked = this._fields.filter((field) =>
      fields.some((f) => {
        if (typeof f == "string") return f == field.$name();
        else return f.$name() == field.$name();
      })
    );

    return uModel(name).fields(picked);
  }

  removeAttributes(attributes: UAttribute<any>[]) {
    this._attributes = this._attributes.filter(
      (attribute) => !attributes.some((a) => a.$name() == attribute.$name())
    );
    return this;
  }
}
