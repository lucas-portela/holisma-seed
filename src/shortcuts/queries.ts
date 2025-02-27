import { UAttribute } from "../entities/attribute";
import { UFeature } from "../entities/feature";
import { UField } from "../entities/field";
import { UModel } from "../entities/model";
import { UModule } from "../entities/module";
import { UDraft } from "../entities/seed";

export const $attr = <Type>(
  root: UModule | UFeature | UModel | UField,
  name: string | UAttribute<Type>
) => {
  const attribute = typeof name != "string" ? name : null;
  name = typeof name == "string" ? name : name.$name();
  return (root
    .$attributeList()
    .find((attr) => attr.$name() == name)
    ?.$value() ?? (attribute ? attribute.$default() : null)) as Type | null;
};

export const $modules = (
  seed: UDraft,
  clause: (module: UModule) => boolean
) => {
  return seed.$moduleList().filter(clause);
};

export const $features = (
  module: UModule,
  clause: (feature: UFeature) => boolean
) => {
  return module.$featureList().filter(clause);
};

export const $fields = (model: UModel, clause: (field: UField) => boolean) => {
  return model.$fieldList().filter(clause);
};
