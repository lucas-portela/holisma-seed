import { Attribute } from "../entities/attribute";
import { Model } from "../entities/model";
import { ref } from "./attributes";
import { field } from "./entities";

export const fieldInstantiator =
  (type: string, builtInAttributes: Attribute<any>[] = []) =>
  (name: string, attributes: Attribute<any>[] = []) =>
    field(name, type).attributes(builtInAttributes).attributes(attributes);

export const str = fieldInstantiator("string");
export const num = fieldInstantiator("number");
export const bool = fieldInstantiator("boolean");
export const date = fieldInstantiator("date");
export const nested = (
  name: string,
  nested: Model,
  attributes: Attribute<any>[] = []
) => field(name, "nested").attributes([ref(nested), ...attributes]);
export const nestedArray = (
  name: string,
  nested: Model,
  attributes: Attribute<any>[] = []
) => field(name, "nested-array").attributes([ref(nested), ...attributes]);
