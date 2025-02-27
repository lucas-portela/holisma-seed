import { UAttribute } from "../entities/attribute";
import { UField } from "../entities/field";
import { UFeature } from "../entities/feature";
import { UModel } from "../entities/model";
import { UDraft } from "../entities/seed";
import { UModule } from "../entities/module";

export const uAttr = <Type>(name: string, value?: Type) =>
  new UAttribute<Type>(name, value);

export const uField = (name: string, type?: string) => new UField(name, type);

export const uModel = (name: string) => new UModel(name);

export const uFeature = (name: string) => new UFeature(name);

export const uModule = (name: string) => new UModule(name);

export const uDraft = (name: string) => new UDraft(name);
