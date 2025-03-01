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
import { parseDocument } from "yaml";
import { UModel } from "./model";
import { UFeature } from "./feature";
import { UAttribute } from "./attribute";
import { uEnum } from "../shortcuts/fields";
import { _enum, _ref } from "../shortcuts/attributes";
import { UField } from "./field";
import { ParsingError } from "../errors/parsing-error";
import { string } from "yaml/dist/schema/common/string";
import { $attr } from "../shortcuts/queries";

export class UDraft {
  private _modules: UModule[] = [];
  private _attributes: UAttribute<any>[] = [];
  private _workingDir?: string;
  private _renderers: URenderer[] = [];

  constructor() {}

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

  $attributes() {
    return [...this._attributes];
  }

  attributes(attributes: UAttribute<any>[]) {
    this.removeAttributes(attributes);
    this._attributes = this._attributes.concat(attributes);
    return this;
  }

  removeAttributes(attributes: UAttribute<any>[]) {
    this._attributes = this._attributes.filter(
      (attribute) => !attributes.some((a) => a.$name() == attribute.$name())
    );
    return this;
  }

  static load(filePath: string) {
    const ext = path.extname(filePath);
    const content = fs.readFileSync(filePath, "utf-8");
    switch (ext) {
      case ".yaml":
        return UDraft.yaml(content);
      case ".json":
        return UDraft.json(content);
      default:
        throw new UDraftError(`Unsupported file extension: ${ext}`);
    }
  }

  static yaml(yamlDraft: string) {
    try {
      const rawDraft = parseDocument(yamlDraft).toJSON();
      return UDraft._parse(rawDraft);
    } catch (e) {
      if (e instanceof ParsingError)
        term.red(`[uDraft] Parsing Error: `).red.bold(e.message + "\n");
      else if (
        ["YAMLParseError", "YAMLWarning"].includes((e as any).name) ||
        e instanceof ReferenceError
      )
        term
          .red(`[uDraft] Error in YAML file: `)
          .red.bold(`${(e as any).message}\n`);
      else throw e;
      return null;
    }
  }

  static json(jsonDraft: string) {
    try {
      const rawDraft = JSON.parse(jsonDraft);
      return UDraft._parse(rawDraft);
    } catch (e) {
      if (e instanceof ParsingError)
        term.red(`[uDraft] Parsing Error: `).red.bold(e.message + "\n");
      else if (e instanceof SyntaxError)
        term.red(`[uDraft] Error in JSON file: `).red.bold(`${e.stack}\n`);
      else throw e;
      return null;
    }
  }

  static _parse(rawDraft: any) {
    if (!rawDraft?.draft) throw new ParsingError(`No draft found in the file`);

    const draft = new UDraft();

    const simpleTypes = ["string", "number", "int", "float", "boolean", "date"];

    const modelTriggers: Record<string, ((model: UModel | null) => void)[]> =
      {};

    const models: Record<string, UModel> = {};

    const addModelTrigger = (
      modelName: string,
      trigger: (model: UModel | null) => void
    ) => {
      if (models[modelName]) {
        trigger(models[modelName]);
        return;
      }

      if (!modelTriggers[modelName]) modelTriggers[modelName] = [];
      modelTriggers[modelName].push(trigger);
    };

    const emitModelUpdate = (modelName: string, model: UModel) => {
      if (modelTriggers[modelName])
        modelTriggers[modelName].forEach((trigger) => trigger(model));
    };

    const parseCallSignature = (signature: string) => {
      const match = signature.trim().match(/^\$([^\(]+)(?:\(*([^\)]*)\))*$/);
      if (!match) return null;
      return {
        fn: match[1].trim(),
        args: (match[2] || "")
          .split(",")
          .map((arg) => arg.trim())
          .filter((v) => !!v),
      };
    };
    const parseFieldSignature = (signature: string) => {
      const match = signature.trim().match(/^([^\(]+)\[([^\)]+)\]$/);
      if (!match) return null;
      return { name: match[1].trim(), type: match[2].trim() };
    };
    const parseFieldAttributeSignature = (signature: string) => {
      const match = signature.trim().match(/^([^\(]+)(?:\(*(.+)\))*$/);
      if (!match) return null;
      if (match[1].match(/[\(\)]/g)) return null;
      return {
        name: match[1].trim(),
        value: (match[2] || "").trim().replace(/\)$/, "") as any,
      };
    };
    const parseModelSignature = (signature: string) => {
      const match = signature.match(/[\~\+]*([^\(]+)\(*([^\)]*)\)*/);
      if (!match) return null;
      return {
        name: match[1].trim(),
        extends: match[2]
          .split(",")
          .map((arg) => arg.trim())
          .filter((baseModelName) => !!baseModelName),
      };
    };
    const parseAttribute = (attributeKey: string, rawAttribute: any) => {
      if (attributeKey[0] != "/") return null;
      const attributeName = attributeKey.slice(1).trim();
      return new UAttribute(attributeName, rawAttribute);
    };
    const parseModel = (modelKey: string, rawModel: any) => {
      const isModel = modelKey[0] == "+";
      const isEnum = modelKey[0] == "~";
      if (!isModel && !isEnum) return null;

      const modelSignature = parseModelSignature(modelKey);
      if (!modelSignature)
        throw new ParsingError(`Invalid model declaration: ${modelKey}`);

      const modelName = modelSignature.name;
      const model = new UModel(modelName);

      if (isEnum) model.attributes([new UAttribute("enum", rawModel)]);
      else {
        Object.keys(rawModel).forEach((subModelKey: string) => {
          const subModelData = rawModel[subModelKey];

          const attr = parseAttribute(subModelKey, subModelData);
          if (attr) return model.attributes([attr]);

          const call = parseCallSignature(subModelKey);
          if (call) {
            switch (call.fn) {
              case "pick":
                const srcModelName = call.args[0];
                let didPick = false;
                addModelTrigger(srcModelName, (srcModel: UModel | null) => {
                  if (!srcModel)
                    throw new ParsingError(
                      `Source model ${srcModelName} not found when pick fields to ${modelName} model: ${subModelKey}}`
                    );
                  const fieldsToPick = (subModelData as string[]).map(
                    (fieldName) => {
                      const renameField = fieldName.match(/([^>]+)\>([^>]*)/);
                      if (renameField)
                        return {
                          from: renameField[1].trim(),
                          to: renameField[2].trim(),
                        };
                      return { from: fieldName, to: fieldName };
                    }
                  );
                  const pickField = ({
                    from,
                    to,
                  }: {
                    from: string;
                    to: string;
                  }) => {
                    const srcField = srcModel.$field(from);
                    if (!srcField)
                      throw new ParsingError(
                        `Field ${from} not found in source model ${srcModelName} when picking fields to ${modelName} model: ${subModelKey}}`
                      );
                    if (from === to) model.fields([srcField]);
                    else model.fields([srcField.$clone(to)]);
                  };
                  if (!didPick) {
                    fieldsToPick.forEach(pickField);
                    didPick = true;
                  } else {
                    // Refresh picked fields that were not removed
                    fieldsToPick.forEach(({ from, to }) => {
                      if (model.$field(to)) pickField({ from, to });
                    });
                  }
                });
                break;
              case "remove":
                addModelTrigger(modelName, (updatedModel) => {
                  if (updatedModel) updatedModel.remove(subModelData);
                });
                break;
              default:
                throw new ParsingError(
                  `Invalid call inside Model ${modelName}: ${subModelKey}`
                );
            }
            return;
          }

          const signature = parseFieldSignature(subModelKey);

          if (!signature)
            throw new ParsingError(
              `Invalid field signature inside Model ${modelName} : ${subModelKey}`
            );

          let refModelName = "";

          if (!simpleTypes.includes(signature.type)) {
            refModelName = signature.type;

            if (signature.type[0] == "&") {
              refModelName = signature.type.slice(1);
              signature.type = "reference";
            } else signature.type = "nested";
          }

          const field = new UField(signature.name, signature.type);
          subModelData.forEach((attrKey: string) => {
            const attrSignature = parseFieldAttributeSignature(attrKey);
            if (!attrSignature)
              throw new ParsingError(
                `Invalid field attribute inside field ${subModelKey} from ${modelName} model: ${attrKey}`
              );
            if (attrSignature.value)
              attrSignature.value = eval(attrSignature.value);
            else attrSignature.value = null;
            field.attributes([
              new UAttribute(attrSignature.name, attrSignature.value),
            ]);
          });

          if (refModelName) {
            addModelTrigger(refModelName, (refModel: UModel | null) => {
              if (!refModel)
                throw new ParsingError(
                  `Model ${refModelName} not found to reference inside Model ${modelName}: ${subModelKey}`
                );
              field.attributes([new UAttribute("ref", refModel)]);
            });
          }

          model.fields([field]);
        });

        modelSignature.extends.forEach((baseModelName) => {
          let didExtend = false;
          addModelTrigger(baseModelName, (baseModel: UModel | null) => {
            if (!baseModel)
              throw new ParsingError(
                `Base model ${baseModelName} not found when extending the ${modelName} model: ${modelKey}}`
              );
            if (!didExtend) {
              didExtend = true;
              model.extends(baseModel);
            } else {
              // Refresh extended fields that were not removed
              model.fields(
                baseModel.$fields().filter((field) => baseModel.$field(field))
              );
            }
            emitModelUpdate(modelName, model);
          });
        });
      }
      models[modelName] = model;
      emitModelUpdate(modelName, model);
      return model;
    };

    const parseModule = (moduleKey: string, rawModule: any) => {
      const mod = new UModule(moduleKey);

      Object.keys(rawModule).forEach((subModKey: string) => {
        const subModOp = subModKey[0];
        const subModData = rawModule[subModKey];

        const attr = parseAttribute(subModKey, subModData);
        if (attr) return mod.attributes([attr]);

        const model = parseModel(subModKey, subModData);
        if (model) return mod.models([model]);

        const feature = new UFeature(subModKey);
        mod.features([feature]);
        Object.keys(subModData).forEach((subFeatKey: string) => {
          const subFeatData = subModData[subFeatKey];
          const featAttr = parseAttribute(subFeatKey, subFeatData);
          if (featAttr) return feature.attributes([featAttr]);

          if (subFeatKey == "input") {
            let didSetInput = false;
            Object.keys(subFeatData).forEach((subInputKey: string) => {
              if (didSetInput) return;
              const subInputData = subFeatData[subInputKey];
              const inputModel = parseModel(subInputKey, subInputData);
              if (inputModel) {
                feature.input(inputModel);
                didSetInput = true;
              }
            });
            if (!didSetInput)
              addModelTrigger(subFeatData, (inputModel) => {
                if (!inputModel)
                  throw new ParsingError(
                    `Model ${subFeatData} not found when setting input for ${feature.$name()} feature`
                  );
                feature.input(inputModel);
              });
          }
          if (subFeatKey == "output") {
            let didSetOutput = false;
            Object.keys(subFeatData).forEach((subOutputKey: string) => {
              if (didSetOutput) return;
              const subOutputData = subFeatData[subOutputKey];
              const outputModel = parseModel(subOutputKey, subOutputData);
              if (outputModel) {
                feature.output(outputModel);
                didSetOutput = true;
              }
            });
            if (!didSetOutput)
              addModelTrigger(subFeatData, (outputModel) => {
                if (!outputModel)
                  throw new ParsingError(
                    `Model ${subFeatData} not found when setting output for ${feature.$name()} feature`
                  );
                feature.output(outputModel);
              });
          }
        });
      });

      return mod;
    };

    Object.keys(rawDraft.draft).forEach((rootKey: string) => {
      const rootData = rawDraft.draft[rootKey];
      const rootAttr = parseAttribute(rootKey, rootData);
      if (rootAttr) return draft.attributes([rootAttr]);

      const module = parseModule(rootKey, rootData);
      if (module) return draft.modules([module]);
    });

    Object.keys(modelTriggers).forEach((modelName) => {
      if (models[modelName]) return;
      modelTriggers[modelName].forEach((trigger) => {
        trigger(null);
      });
    });

    return draft;
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
          .bold.green(`${$attr(this, "name")}\n`);
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
