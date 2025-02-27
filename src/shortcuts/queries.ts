import { UAttribute } from "../entities/attribute";
import { UFeature } from "../entities/feature";
import { UField } from "../entities/field";
import { UModel } from "../entities/model";
import { UModule } from "../entities/module";
import { UDraft } from "../entities/draft";

export const $attr = <Type>(
  root: UModule | UFeature | UModel | UField,
  name: string | UAttribute<Type>
) => {
  const attribute = typeof name != "string" ? name : null;
  name = typeof name == "string" ? name : name.$name();
  const foundAttr = root.$attributes().find((attr) => attr.$name() == name);

  if (!foundAttr) {
    if (attribute) {
      return attribute.$default() ?? null;
    }
    return null;
  }
  return foundAttr.$value() as Type;
};

export const $modules = (
  seed: UDraft,
  clause: (module: UModule) => boolean
) => {
  return seed.$modules().filter(clause);
};

export const $features = (
  module: UModule,
  clause: (feature: UFeature) => boolean
) => {
  return module.$features().filter(clause);
};

export const $fields = (model: UModel, clause: (field: UField) => boolean) => {
  return model.$fields().filter(clause);
};
