import { cwd } from "process";
import { PipelineCursor, RenderContent, RenderPath } from "../types/renderer";
import { UModule } from "./module";
import { URenderer } from "./renderer";
import fs from "fs";
import path from "path";
import { pipeline } from "stream";

export class UDraft {
  private _name: string;
  private _modules: UModule[] = [];
  private _workingDir?: string;
  private _renderers: URenderer[] = [];

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

  $renderers() {
    return this._renderers;
  }

  $renderer<Type = URenderer>(rendererClass: new () => Type): Type | null {
    return (
      (this.$renderers().find((r) => r instanceof rendererClass) as Type) ||
      null
    );
  }

  $requireRenderer<Type = URenderer>(rendererClass: new () => Type): Type {
    const renderer = this.$renderer(rendererClass);
    if (renderer) return renderer;
    throw new Error(`Renderer ${rendererClass.name} is required to run first!`);
  }

  extends(seed: UDraft) {
    return this.modules(seed.$moduleList());
  }

  modules(modules: UModule[]) {
    this.remove(modules);
    this._modules = this._modules.concat(modules);
    return this;
  }

  remove(modules: UModule[]) {
    this._modules = this._modules.filter(
      (module) => !modules.some((m) => m.$name() == module.$name())
    );
    return this;
  }

  goTo(workingDir: string) {
    this._workingDir = workingDir;
    return this;
  }

  pipeline(
    renderers: URenderer[],
    waitFor: Promise<void> = Promise.resolve()
  ): PipelineCursor {
    const execution = waitFor.then(
      () =>
        new Promise<void>(async (resolve) => {
          for (const renderer of renderers) {
            await this.render(renderer);
          }
          resolve();
        })
    );

    const cursor: PipelineCursor = {
      goTo: (workingDir: string) => {
        execution.then(() => this.goTo(workingDir));
        return cursor;
      },
      clear: () => {
        execution.then(() => this.clear());
        return cursor;
      },
      pipeline: (renderers: URenderer[]) => {
        return this.pipeline(renderers, execution);
      },
      done: execution,
    };

    return cursor;
  }

  clear() {
    this._renderers.forEach((renderer) => {
      renderer.clear();
    });
    this._renderers = [];
    return this;
  }

  async render(renderer: URenderer) {
    await renderer.init(this);
    const paths: RenderPath[] = renderer.$pathList();
    const contents: RenderContent[] = [];

    for (const renderPath of paths) {
      renderPath.path = renderPath.path.startsWith("/")
        ? renderPath.path
        : path.join(cwd(), this.$workingDir(), renderPath.path);

      const renderDir = path.dirname(renderPath.path);

      if (!fs.existsSync(renderDir))
        fs.mkdirSync(renderDir, { recursive: true });

      let content = "";
      if (fs.existsSync(renderPath.path))
        content = fs.readFileSync(renderPath.path, "utf-8");

      contents.push({
        key: renderPath.key,
        content,
        meta: renderPath.meta,
      });
    }

    await renderer.run(contents);

    for (const renderPath of paths) {
      const output = renderer.$output(renderPath.key);
      if (output === null) continue;

      const dir = path.dirname(renderPath.path);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(renderPath.path, output.content, "utf-8");
    }

    this._renderers.push(renderer);

    return this;
  }
}
