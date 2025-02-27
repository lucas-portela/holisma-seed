import { cwd } from "process";
import { PipelineCursor, RenderContent, RenderPath } from "../types/renderer";
import { UModule } from "./module";
import { URenderer } from "./renderer";
import fs from "fs";
import path from "path";
import { pipeline } from "stream";
import { RendererRequiredError } from "../errors/renderer-required-error";
import { MissingAttributeError } from "../errors/missing-attribute-error";
import { terminal as term } from "terminal-kit";
import { UDraftError } from "../errors/udraft-error";
import Case from "case";

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

  $modules() {
    return [...this._modules];
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

  $requireRenderer<Type extends URenderer>(
    fromRendererClass: URenderer,
    rendererClass: new () => Type
  ): Type {
    const renderer = this.$renderer(rendererClass);
    if (renderer) return renderer;
    throw new RendererRequiredError(fromRendererClass, rendererClass);
  }

  extends(seed: UDraft) {
    return this.modules(seed.$modules());
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

  private _goTo(workingDir: string) {
    term.blue(`[uDraft] Working Directory: `).bold.magenta(`${workingDir}\n`);
    this._workingDir = workingDir;
    return this;
  }

  private _clear() {
    term.blue(`[uDraft] Clear Renderers\n`);
    this._renderers.forEach((renderer) => {
      renderer.clear();
    });
    this._renderers = [];
    return this;
  }

  begin(workingDir: string) {
    return this._pipeline([]).goTo(workingDir);
  }

  private _pipeline(
    renderers: URenderer[],
    _controls?: {
      waitFor: Promise<void>;
      executionError: Promise<void>;
      start: () => void;
      error: (err: any) => void;
    }
  ): PipelineCursor {
    if (!_controls) {
      _controls = {
        start: () => {},
        error: (err) => {},
        waitFor: Promise.resolve(),
        executionError: Promise.resolve(),
      };

      _controls.waitFor = new Promise((resolve, reject) => {
        _controls!.start = resolve;
      });
      _controls.executionError = new Promise((resolve, reject) => {
        _controls!.error = reject;
      });
    }

    const execution = _controls.waitFor
      .then(
        () =>
          new Promise<void>(async (resolve, reject) => {
            try {
              for (const renderer of renderers) {
                await this.render(renderer);
              }
              resolve();
            } catch (err) {
              reject(err);
            }
          })
      )
      .catch((err) => {
        if (!_controls) throw err;

        if (err instanceof UDraftError) {
          term.red(`[uDraft] Pipeline Error: `).black.bold(err.message + "\n");
        } else _controls.error(err);

        const halt = new Promise<void>(() => {});
        return halt;
      });

    const cursor: PipelineCursor = {
      goTo: (workingDir: string) => {
        execution.then(() => this._goTo(workingDir));
        return cursor;
      },
      clear: () => {
        execution.then(() => this._clear());
        return cursor;
      },
      pipeline: (renderers: URenderer[]) => {
        return this._pipeline(renderers, {
          ..._controls,
          waitFor: execution,
        });
      },
      exec: () => {
        term
          .blue(`[uDraft] Executing uDraft: `)
          .bold.green(`${Case.title(this.$name())}\n`);
        _controls.start();
        return Promise.race([execution, _controls.executionError]).then(() => {
          term.bold.green(`\n[uDraft] Draft executed successfully!\n\n`);
        });
      },
    };

    return cursor;
  }

  async render(renderer: URenderer) {
    term
      .blue(`[uDraft] Rendering: `)
      .bold.yellow(`${renderer.constructor.name}\n`);
    await renderer.init(this);
    const paths: RenderPath[] = renderer.$paths();
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

    const modules = renderer.$selection().modules || [];
    const models = renderer.$selection().models || [];
    const features = renderer.$selection().features || [];

    if (modules.length) {
      term.white(`[uDraft] Selected Modules: `);
      term.white.bold(
        modules.map((module) => module.$name()).join(", ") + "\n"
      );
    }

    if (models.length) {
      term.white(`[uDraft] Selected Models: `);
      term.white.bold(models.map((model) => model.$name()).join(", ") + "\n");
    }

    if (features.length) {
      term.white(`[uDraft] Selected Features: `);
      term.white.bold(
        features.map((feature) => feature.$name()).join(", ") + "\n"
      );
    }

    for (const renderPath of paths) {
      const output = renderer.$output(renderPath.key);
      if (output === null) continue;

      const dir = path.dirname(renderPath.path);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(renderPath.path, output.content, "utf-8");
      term
        .white(`[uDraft] Output: `)
        .bold.white(`${renderPath.key} `)
        .black(
          `${renderer
            .$resolveRelativePath(cwd() + "/index.js", renderPath.path)
            .replace(/^\.\//, "")}\n`
        );
    }

    this._renderers.push(renderer);

    return this;
  }
}
