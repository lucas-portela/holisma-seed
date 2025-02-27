import { UDraftError } from "./udraft-error";

export class MissingAttributeError extends UDraftError {
  constructor(
    root: string,
    rootType: "field" | "model" | "module",
    attribute: string
  ) {
    super(`Attribute ${attribute} is missing on ${rootType} ${root}!`);
  }
}
