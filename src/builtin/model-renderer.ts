import { Model } from "../entities/model";
import { Renderer } from "../entities/renderer";
import { Seed } from "../entities/seed";
import { addPackgeJsonDependency } from "../helpers/json";
import { $attr, $findModules } from "../shortcuts/queries";
import {
  RendererFileInput,
  RendererOutput,
  RendererSelection,
} from "../types/renderer";
import Case from "case";
import { closeCursor, writeToCursor } from "../utils/rendering";
import { max, min, ref, required } from "../shortcuts/attributes";
import { attr, field } from "../shortcuts/entities";
import { Attribute } from "../entities/attribute";
import path from "path";
import { attrInstantiator, fieldInstantiator } from "../helpers/instantiators";

export class ModelRenderer extends Renderer {
  constructor(
    workingDir?: string,
    private _modelDir: string = "src/models",
    private _where?: (model: Model) => boolean
  ) {
    super(workingDir);
  }

  async select(seed: Seed): Promise<RendererSelection> {
    const modules = seed.$moduleList();
    const files: RendererFileInput = {
      packageJson: "package.json",
    };
    const models: Model[] = [];

    modules.forEach((mod) => {
      let foundModels: Model[] = [];
      mod.$featureList().forEach((feature) => {
        const root: Model[] = [];
        if (feature.$input()) root.push(feature.$input() as Model);
        if (feature.$output()) root.push(feature.$output() as Model);

        const deepSearch = (model: Model) => {
          if (!foundModels.some((m) => m.$name() == model.$name())) {
            foundModels.push(model);
            model.$fieldList().forEach((field) => {
              if (field.$type() == "nested") {
                const nestedModel = $attr(field, ref());
                if (nestedModel) deepSearch(nestedModel);
              }
            });
          }
        };
        root.forEach(deepSearch);
      });

      if (this._where) foundModels = foundModels.filter(this._where);
      foundModels.forEach((model) => {
        files[this._modelClassName(model)] = path.join(
          this._modelDir,
          `${Case.kebab(mod.$name())}/${this._modelFileName(model)}`
        );
      });
      models.push(...foundModels);
    });

    return {
      modules,
      files,
      models,
    };
  }

  private _modelImport(
    currentModel: Model,
    model: Model,
    selection: RendererSelection
  ): string {
    if (!selection.files) return "";
    const currentModelFilePath =
      selection.files[this._modelClassName(currentModel)];
    const modelFilePath = selection.files[this._modelClassName(model)];
    const sameModule =
      path.dirname(currentModelFilePath) == path.dirname(modelFilePath);

    if (sameModule)
      return `import { ${this._modelClassName(
        model
      )} } from "./${this._modelFileName(model)}";\n`;
    else
      return `import { ${this._modelClassName(
        model
      )} } from "../${path.basename(
        path.dirname(modelFilePath)
      )}/${this._modelFileName(model)}";\n`;
  }

  private _modelClassName(model: Model) {
    return Case.pascal(model.$name());
  }

  private _modelFileName(model: Model) {
    return `${Case.kebab(model.$name())}.ts`;
  }

  async render(
    seed: Seed,
    selection: RendererSelection,
    files: RendererFileInput
  ): Promise<RendererOutput> {
    const packageJson = addPackgeJsonDependency(files.packageJson, [
      {
        name: "class-validator",
        version: "^0.14.1",
      },
    ]);

    const renderedFiles: RendererOutput = {};

    selection.models?.forEach((model) => {
      const fieldCursor = "#field-cursor\n";
      const importCursor = "#import-cursor\n";

      let content = `#import-cursor\nexport class ${this._modelClassName(
        model
      )} {\n${fieldCursor}}`;

      const fields = model.$fieldList();
      const importedModels: string[] = [];
      fields.forEach((field) => {
        if (["nested", "nested-array"].includes(field.$type() as any)) {
          const nestedModel = $attr(field, ref());

          if (nestedModel) {
            content = writeToCursor(
              fieldCursor,
              `  ${Case.camel(field.$name())}${
                !$attr(field, required()) ? "?" : ""
              }: ${this._modelClassName(nestedModel)}${
                field.$type() == "nested-array" ? "[]" : ""
              };\n`,
              content
            );

            if (!importedModels.includes(this._modelClassName(nestedModel))) {
              content = writeToCursor(
                importCursor,
                this._modelImport(model, nestedModel, selection),
                content
              );
              importedModels.push(this._modelClassName(nestedModel));
            }
          }
        } else {
          let type = field.$type();
          if (type === "date") type = "Date";
          content = writeToCursor(
            fieldCursor,
            `  ${Case.camel(field.$name())}${
              !$attr(field, required()) ? "?" : ""
            }: ${type};\n`,
            content
          );
        }
      });
      if (importedModels.length > 0)
        content = writeToCursor(importCursor, "\n", content);
      content = closeCursor(fieldCursor, content);
      content = closeCursor(importCursor, content);
      renderedFiles[this._modelClassName(model)] = content;
    });

    return {
      packageJson,
      ...renderedFiles,
    };
  }
}

// Fields
export const str = fieldInstantiator("string");
export const num = fieldInstantiator("number");
export const bool = fieldInstantiator("boolean");
export const date = fieldInstantiator("date");
export const nested = (
  name: string,
  nested: Model,
  attributes: Attribute<any>[] = []
) => field(name, "nested").attributes([ref(nested), ...attributes]);
export const nestedArray = (
  name: string,
  nested: Model,
  attributes: Attribute<any>[] = []
) => field(name, "nested-array").attributes([ref(nested), ...attributes]);
