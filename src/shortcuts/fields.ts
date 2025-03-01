import { UAttribute } from "../entities/attribute";
import { UModel } from "../entities/model";
import { MissingAttributeError } from "../errors/missing-attribute-error";
import { fieldBuilder } from "../helpers/builders";
import { _enum, _ref } from "./attributes";
import { uField, uModel } from "./entities";
import { $attr } from "./queries";
import { terminal as term } from "terminal-kit";

export const throwMissingFieldParameterError = (
  field: string,
  fieldType: string,
  parameter: string
) => {
  term
    .red(`[uDraft] Missing Field Parameter: The field `)
    .bold.red(field)
    .red(` of type `)
    .bold.red(fieldType)
    .red(` is missing the `)
    .bold.red(parameter)
    .red(` attribute!\n`);
  process.exit(-1);
};
export const uString = fieldBuilder("string");
export const uNumber = fieldBuilder("number");
export const uInteger = fieldBuilder("int");
export const uFloat = fieldBuilder("float");
export const uBoolean = fieldBuilder("boolean");
export const uDate = fieldBuilder("date");
export const uEnum = <Type>(
  name: string,
  enumName: string,
  enumDefinition?: Record<string, Type>
) => {
  const enumModel = uModel(enumName);
  if (enumDefinition) enumModel.attributes([_enum(enumDefinition)]);
  else if (!$attr(enumModel, _enum()))
    throwMissingFieldParameterError(
      name,
      "uEnum:" + enumName,
      "enumDefinition"
    );
  return uNested(name, enumModel);
};
export const uReference = (
  name: string,
  nested: UModel,
  attributes: UAttribute<any>[] = []
) => uField(name, "reference").attributes([_ref(nested), ...attributes]);
export const uNested = (
  name: string,
  nested: UModel,
  attributes: UAttribute<any>[] = []
) => uField(name, "nested").attributes([_ref(nested), ...attributes]);
