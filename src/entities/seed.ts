import { cwd } from "process";
import { RendererFileInput } from "../types/renderer";
import { Model } from "./model";
import { Module } from "./module";
import { Renderer } from "./renderer";
import fs from "fs";

export class Seed {
  private _name: string;
  private _modules: Module[] = [];

  constructor(name: string) {
    this._name = name;
  }

  $name() {
    return this._name;
  }

  $moduleList() {
    return this._modules;
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

  async render(renderer: Renderer) {
    const selection = await renderer.select(this);
    const files: RendererFileInput = {};
    Object.keys(selection.files ?? {}).forEach((key) => {
      files[key] = "";
    });
    const result = await renderer.render(this, selection, {});
    for (const fileName in selection.files) {
      const content = result[fileName];
      const filePath = selection.files[fileName];
      const dir =
        cwd() +
        "/" +
        renderer.workingDir +
        "/" +
        filePath.split("/").slice(0, -1).join("/");
      if (!content) continue;

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, content, "utf-8");
    }
  }
}
