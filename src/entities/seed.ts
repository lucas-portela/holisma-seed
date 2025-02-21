import { cwd } from "process";
import { RendererFileInput } from "../types/renderer";
import { Module } from "./module";
import { Renderer } from "./renderer";
import fs from "fs";
import path from "path";

export class Seed {
  private _name: string;
  private _modules: Module[] = [];
  private _workingDir?: string;

  constructor(name: string) {
    this._name = name;
  }

  $name() {
    return this._name;
  }

  $moduleList() {
    return this._modules;
  }

  $workingDir() {
    return this._workingDir ?? "";
  }

  extends(seed: Seed) {
    return this.modules(seed.$moduleList());
  }

  modules(modules: Module[]) {
    this.remove(modules);
    this._modules = this._modules.concat(modules);
    return this;
  }

  remove(modules: Module[]) {
    this._modules = this._modules.filter(
      (module) => !modules.some((m) => m.$name() == module.$name())
    );
    return this;
  }

  workingDir(workingDir: string) {
    this._workingDir = workingDir;
    return this;
  }

  async render(renderer: Renderer) {
    const selection = await renderer.select(this);
    const files: RendererFileInput = {};

    for (const fileName in selection.files) {
      const filePath = selection.files[fileName].startsWith("/")
        ? selection.files[fileName]
        : path.join(cwd(), this.$workingDir(), selection.files[fileName]);
      selection.files[fileName] = filePath;

      const dir = path.dirname(filePath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (!fs.existsSync(filePath)) files[fileName] = "";
      else files[fileName] = fs.readFileSync(filePath, "utf-8");
    }

    const result = await renderer.render(this, selection, files);

    for (const fileName in selection.files) {
      const content = result[fileName];
      if (content === undefined) continue;

      const filePath = selection.files[fileName];
      const dir = path.dirname(filePath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, content, "utf-8");
    }

    return selection.files ?? {};
  }
}
