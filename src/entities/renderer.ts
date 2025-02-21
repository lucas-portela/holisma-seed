import {
  RendererFileInput,
  RendererOutput,
  RendererSelection,
} from "../types/renderer";
import { Seed } from "./seed";

export class Renderer {
  constructor(public workingDir: string) {}

  async select(seed: Seed): Promise<RendererSelection> {
    return { modules: seed.$moduleList() };
  }

  async render(
    seed: Seed,
    selection: RendererSelection,
    files: RendererFileInput
  ): Promise<RendererOutput> {
    return {};
  }
}
