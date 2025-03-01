import { UDraftError } from "./udraft-error";

export class ParsingError extends UDraftError {
  constructor(message: string) {
    super(message);
  }
}
