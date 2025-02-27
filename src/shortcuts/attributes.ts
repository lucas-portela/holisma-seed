import { UModel } from "../entities/model";
import { UModule } from "../entities/module";
import { attrBuilder } from "../helpers/builders";
import { uAttr } from "./entities";

// Validation
export const _required = attrBuilder<boolean>("required", true, true);
export const _optional = attrBuilder<boolean>("optional", true, false);
export const _min = attrBuilder<number>("min", 0);
export const _max = attrBuilder<number>("max", Number.MAX_SAFE_INTEGER);
export const _minLength = attrBuilder<number>("min-length", 0);
export const _maxLength = attrBuilder<number>(
  "max-length",
  Number.MAX_SAFE_INTEGER
);
export const _size = attrBuilder<number>("length");
export const _notEmpty = attrBuilder<boolean>("notEmpty", true, false);
export const _notInArray = attrBuilder<any[]>("not-in");
export const _inArray = attrBuilder<any[]>("in");
export const _matches = attrBuilder<RegExp>("regex");

// Sanitization
export const _trim = attrBuilder<boolean>("trim", true, false);
export const _lowercase = attrBuilder<boolean>("lowercase", true, false);
export const _uppercase = attrBuilder<boolean>("uppercase", true, false);
export const _capitalize = attrBuilder<boolean>("capitalize", true, false);

// Database
export const _primary = attrBuilder<boolean>("primary", true, false);
export const _index = attrBuilder<number>("index", 1);
export const _unique = attrBuilder<boolean>("unique", true, false);
export const _virtual = attrBuilder<boolean>("virtual", true, false);

// Modules and Features
export const _api = attrBuilder<string>("api", "rest");
export const _httpPath = attrBuilder<string>("http-path", "/");
export const _httpMethod = attrBuilder<
  "post" | "get" | "put" | "delete" | "search"
>("http-method", "get");
export const _urlParam = attrBuilder<UModel>("param");
export const _rootModule = attrBuilder<UModule>("root-module");

// General
export const _isArray = attrBuilder<boolean>("array", true, false);
export const _ref = attrBuilder<UModel>("ref");
export const _defaultValue = <Type>(valueFn?: () => Type) =>
  uAttr<string>("default-value", valueFn?.toString());
export const _computedValue = <Type>(valueFn: (model: UModel) => Type) =>
  uAttr<string>("computed-value", valueFn?.toString());
