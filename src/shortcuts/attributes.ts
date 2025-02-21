import { Model } from "../entities/model";
import { attr } from "./entities";

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

// Validation
export const required = attrInstantiator<boolean>("required", true, false);
export const min = attrInstantiator<number>("min", 0);
export const max = attrInstantiator<number>("max", Number.MAX_SAFE_INTEGER);
export const size = attrInstantiator<number>("length");
export const notEmpty = attrInstantiator<boolean>("notEmpty", true, false);
export const matches = attrInstantiator<RegExp>("regex");

// Sanitization
export const trim = attrInstantiator<boolean>("trim", true, false);
export const lowercase = attrInstantiator<boolean>("lowercase", true, false);
export const uppercase = attrInstantiator<boolean>("uppercase", true, false);
export const capitalize = attrInstantiator<boolean>("capitalize", true, false);

// Database
export const primary = attrInstantiator<boolean>("primary", true, false);
export const index = attrInstantiator<number>("index", 1);
export const unique = attrInstantiator<boolean>("unique", true, false);
export const virtual = attrInstantiator<boolean>("virtual", true, false);

// Modules and Features
export const api = attrInstantiator<string>("api", "rest");
export const httpPath = attrInstantiator<string>("http-path", "/");
export const httpMethod = attrInstantiator<
  "post" | "get" | "put" | "delete" | "search"
>("http-method", "get");
export const urlParam = attrInstantiator<Model>("param");

// General
export const ref = attrInstantiator<Model>("ref");
export const defaultValue = <Type>(valueFn?: () => Type) =>
  attr<string>("default-value", valueFn?.toString());
export const computedValue = <Type>(valueFn: (model: Model) => Type) =>
  attr<string>("computed-value", valueFn?.toString());
