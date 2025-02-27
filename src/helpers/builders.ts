import { UAttribute } from "../entities/attribute";
import { uAttr, uField } from "../shortcuts/entities";

export const fieldBuilder =
  (type: string, builtInAttributes: UAttribute<any>[] = []) =>
  (name: string, attributes: UAttribute<any>[] = []) =>
    uField(name, type).attributes(builtInAttributes).attributes(attributes);

export const attrBuilder =
  <Type>(
    name: string,
    defaultWhenPresent?: Type,
    defaultWhenNotPresent?: Type
  ) =>
  (value?: Type) =>
    uAttr<Type>(name, value ?? defaultWhenPresent).default(
      defaultWhenNotPresent
    );
