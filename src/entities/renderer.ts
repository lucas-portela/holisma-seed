import path from "path";
import {
  RendererFileInput,
  RendererOutput,
  RendererSelection,
} from "../types/renderer";
import { Seed } from "./seed";
import { cwd } from "process";

export class Renderer {
  public workingDir: string;

  constructor(workingDir?: string) {
    this.workingDir = workingDir ?? "";
  }

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
