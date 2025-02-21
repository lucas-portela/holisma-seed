import { Attribute } from "../entities/attribute";
import { Feature } from "../entities/feature";
import { Field } from "../entities/field";
import { Model } from "../entities/model";
import { Module } from "../entities/module";
import { Seed } from "../entities/seed";

export const $attr = <Type>(
  root: Module | Feature | Model | Field,
  name: string | Attribute<Type>
) => {
  const attribute = typeof name != "string" ? name : null;
  name = typeof name == "string" ? name : name.$name();
  return (root
    .$attributeList()
    .find((attr) => attr.$name() == name)
    ?.$value() ?? (attribute ? attribute.$default() : null)) as Type | null;
};

export const $findModules = (
  seed: Seed,
  clause: (module: Module) => boolean
) => {
  return seed.$moduleList().filter(clause);
};

export const $findFeatures = (
  module: Module,
  clause: (feature: Feature) => boolean
) => {
  return module.$featureList().filter(clause);
};

export const $findFields = (
  model: Model,
  clause: (field: Field) => boolean
) => {
  return model.$fieldList().filter(clause);
};
