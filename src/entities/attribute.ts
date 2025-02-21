export class Attribute<Type> {
  private _name: string;
  private _value?: Type;
  private _defaultValue?: Type;

  constructor(name: string, value?: Type) {
    this._name = name;
    this._value = value;
  }

  $name() {
    return this._name;
  }

  $value() {
    return this._value ?? this._defaultValue;
  }

  default(value?: Type) {
    this._defaultValue = value;
    return this;
  }

  value(value?: Type) {
    this._value = value;
    return this;
  }
}
