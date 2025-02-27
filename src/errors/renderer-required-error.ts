import { URenderer } from "../entities/renderer";
import { UDraftError } from "./udraft-error";

export class RendererRequiredError<Type extends URenderer> extends UDraftError {
  constructor(renderer: URenderer, requiredRendererClass: new () => Type) {
    super(
      `Renderer ${requiredRendererClass.name} is required to run before ${renderer.constructor.name}!`
    );
  }
}
