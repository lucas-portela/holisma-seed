import { UAttribute } from "../entities/attribute";
import { uattr, uField } from "../shortcuts/entities";

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
    uattr<Type>(name, value ?? defaultWhenPresent).default(
      defaultWhenNotPresent
    );

export const attrBuilderWithRequiredValue =
  <Type>(name: string, defaultWhenNotPresent?: Type) =>
  (value: Type) =>
    uattr<Type>(name, value).default(defaultWhenNotPresent);
