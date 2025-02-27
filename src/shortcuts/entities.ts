import { UAttribute } from "../entities/attribute";
import { UField } from "../entities/field";
import { UFeature } from "../entities/feature";
import { UModel } from "../entities/model";
import { UDraft } from "../entities/draft";
import { UModule } from "../entities/module";

const modelMem = new Map<string, UModel>();
const featureMem = new Map<string, UFeature>();

export const uattr = <Type>(name: string, value?: Type) =>
  new UAttribute<Type>(name, value);

export const uField = (name: string, type?: string) => new UField(name, type);

export const uModel = (name: string) =>
  modelMem.get(name) ||
  (modelMem.set(name, new UModel(name)).get(name) as UModel);

export const uFeature = (name: string) =>
  featureMem.get(name) ||
  (featureMem.set(name, new UFeature(name)).get(name) as UFeature);

export const uModule = (name: string) => new UModule(name);

export const uDraft = (name: string) => {
  featureMem.clear();
  modelMem.clear();
  return new UDraft(name);
};
