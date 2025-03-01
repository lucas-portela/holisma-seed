export type EncodedFieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "enum"
  | "reference"
  | "nested";

export type EncodedAttribute = {
  value: string | number | boolean | Date | null;
};

export type EncodedAttributes = Record<string, any>;

export type EncodedField = {
  type: EncodedFieldType;
  attributes: EncodedAttributes;
};

export type EncodedFields = Record<string, EncodedField>;

export type EncodedModel = {
  name: string;
  attributes: EncodedAttributes;
  fields: EncodedFields;
};

export type EncodedFeature = {
  name: string;
  input: EncodedModel;
  output: EncodedModel;
};

export type EncodedFeatures = EncodedFeature[];

export type EncodedModule = {
  name: string;
  attributes: EncodedAttributes;
  models: EncodedModel[];
};
