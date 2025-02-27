import { UAttribute } from "../entities/attribute";
import { UModel } from "../entities/model";
import { fieldBuilder } from "../helpers/builders";
import { _ref } from "./attributes";
import { uField } from "./entities";

export const uString = fieldBuilder("string");
export const uNumber = fieldBuilder("number");
export const uInteger = fieldBuilder("integer");
export const uFloat = fieldBuilder("float");
export const uBoolean = fieldBuilder("boolean");
export const uDate = fieldBuilder("date");
export const uReference = (
  name: string,
  nested: UModel,
  attributes: UAttribute<any>[] = []
) => uField(name, "ref-id").attributes([_ref(nested), ...attributes]);
export const uNested = (
  name: string,
  nested: UModel,
  attributes: UAttribute<any>[] = []
) => uField(name, "nested").attributes([_ref(nested), ...attributes]);
