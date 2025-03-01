import { UModel } from "../entities/model";
import { UModule } from "../entities/module";
import { attrBuilder } from "../helpers/builders";
import { uattr } from "./entities";

// Validation
export const _required = attrBuilder<boolean>("required", true, true);
export const _min = attrBuilder<number>("min", 0);
export const _max = attrBuilder<number>("max", Number.MAX_SAFE_INTEGER);
export const _minLength = attrBuilder<number>("minLength", 0);
export const _maxLength = attrBuilder<number>(
  "max-length",
  Number.MAX_SAFE_INTEGER
);
export const _size = attrBuilder<number>("length");
export const _notEmpty = attrBuilder<boolean>("notEmpty", true, false);
export const _notIn = attrBuilder<any[]>("notIn");
export const _in = attrBuilder<any[]>("in");
export const _regex = attrBuilder<RegExp>("regex");

// Sanitization
export const _trim = attrBuilder<boolean>("trim", true, false);
export const _lowercase = attrBuilder<boolean>("lowercase", true, false);
export const _uppercase = attrBuilder<boolean>("uppercase", true, false);
export const _capitalize = attrBuilder<boolean>("capitalize", true, false);

// Database
export const _schema = attrBuilder<string>("schema");
export const _primary = attrBuilder<boolean>("primary", true, false);
export const _index = attrBuilder<number | boolean>("index", 1);
export const _unique = attrBuilder<boolean>("unique", true, false);
export const _virtual = attrBuilder<boolean>("virtual", true, false);
export const _noId = attrBuilder<boolean>("no-id", true, false);

// Modules and Features
export const _http = attrBuilder<{
  method?: string;
  url?: string;
  contentType?: string;
  noBody?: boolean;
  params?: { [paramName: string]: string }; // params {<param name>: <input model field name>}
}>("http", {
  url: "/",
  method: "get",
});
export const _rootModule = attrBuilder<UModule>("root-module");

// General
export const _array = attrBuilder<boolean>("array", true, false);
export const _enum = <Type>(enumDefinition?: Record<string, Type>) => {
  if (enumDefinition) {
    const firstKey = Object.keys(enumDefinition)[0];
    const hasReverseMappint =
      enumDefinition[enumDefinition[firstKey] as any] == firstKey;
    if (hasReverseMappint) {
      const newEnumDefinition: Record<string, Type> = {};
      for (const key in enumDefinition) {
        if (!isNaN(parseInt(key))) continue;
        newEnumDefinition[key] = enumDefinition[key];
      }
      enumDefinition = newEnumDefinition;
    }
  }
  return uattr("enum", enumDefinition);
};
export const _ref = attrBuilder<UModel>("ref");
export const _defaultValue = <Type>(valueFn?: () => Type) =>
  uattr<string>("default-value", valueFn?.toString());
export const _computedValue = <Type>(valueFn: (model: UModel) => Type) =>
  uattr<string>("computed-value", valueFn?.toString());
