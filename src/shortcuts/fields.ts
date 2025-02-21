import { Attribute } from "../entities/attribute";
import { Model } from "../entities/model";
import { fieldInstantiator } from "../helpers/instantiators";
import { ref } from "./attributes";
import { field } from "./entities";

export const str = fieldInstantiator("string");
export const num = fieldInstantiator("number");
export const int = fieldInstantiator("integer");
export const float = fieldInstantiator("float");
export const bool = fieldInstantiator("boolean");
export const date = fieldInstantiator("date");
export const nested = (
  name: string,
  nested: Model,
  attributes: Attribute<any>[] = []
) => field(name, "nested").attributes([ref(nested), ...attributes]);
