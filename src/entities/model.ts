import { model } from "../shortcuts/entities";
import { Field } from "./field";

export class Model {
  private _name: string;
  private _fields: Field[] = [];
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
    return this.fields(model.$fieldList());
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
}
