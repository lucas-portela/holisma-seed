import { Attribute } from "../entities/attribute";
import { attr, field } from "../shortcuts/entities";

export const fieldInstantiator =
  (type: string, builtInAttributes: Attribute<any>[] = []) =>
  (name: string, attributes: Attribute<any>[] = []) =>
    field(name, type).attributes(builtInAttributes).attributes(attributes);

export const attrInstantiator =
  <Type>(
    name: string,
    defaultWhenPresent?: Type,
    defaultWhenNotPresent?: Type
  ) =>
  (value?: Type) =>
    attr<Type>(name, value ?? defaultWhenPresent).default(
      defaultWhenNotPresent
    );
