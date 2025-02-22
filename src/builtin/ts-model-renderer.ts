import { Model } from "../entities/model";
import { Renderer } from "../entities/renderer";
import { $attr } from "../shortcuts/queries";
import { RenderContent, RenderPath, RenderSelection } from "../types/renderer";
import Case from "case";
import { closeCursor, writeToCursor } from "../utils/rendering";
import { isArray, ref } from "../shortcuts/attributes";
import path from "path";
import { Module } from "../entities/module";
import { Field } from "../entities/field";

export class TSModelRenderer extends Renderer {
  private _modelDir = "src/models";
  private _dtoDir = "src/dto";
  private _includeModuleInDir = true;
  private _where?: (module: Module, model: Model) => boolean;

  constructor(options?: {
    modelDir?: string;
    dtoDir?: string;
    includeModuleInDir?: boolean;
    where?: (module: Module, model: Model) => boolean;
  }) {
    super();
    if (options?.modelDir) this._modelDir = options.modelDir;
    if (options?.dtoDir) this._dtoDir = options.dtoDir;
    if (options?.includeModuleInDir)
      this._includeModuleInDir = options.includeModuleInDir;
    if (options?.where) this._where = options.where;
  }

  $isDto(model: Model) {
    const output = this.$output(model.$name());
    if (output) return !!output.meta?.isDto;
    return null;
  }

  $resolveImport(from: string, model: Model): string {
    if (!this.$selection().paths) return "";
    const modelPath = this.$path(this.$className(model));
    if (!modelPath) return "";

    const fromParts = from.split("/").slice(0, -1);
    const toParts = modelPath.path.split("/").slice(0, -1);
    for (let i = 0; i < fromParts.length; i++) {
      if (fromParts.slice(0, i).join("/") !== toParts.slice(0, i).join("/")) {
        let returns = "";
        for (let j = 0; j <= fromParts.length - i; j++) returns += "../";

        return `import { ${this.$className(model)} } from "${returns}${toParts
          .slice(i - 1)
          .join("/")}/${this.$fileName(model, false)}";\n`;
      }
    }
    return `import { ${this.$className(model)} } from "./${this.$fileName(
      model,
      false
    )}";\n`;
  }

  $key(model: Model) {
    return this.$className(model);
  }

  $className(model: Model) {
    return Case.pascal(model.$name());
  }

  $fileName(model: Model, extension = true) {
    return `${Case.kebab(model.$name())}${extension ? ".ts" : ""}`;
  }

  $fieldName(field: Field) {
    return Case.camel(field.$name());
  }

  $fieldType(field: Field) {
    let type = field.$type();
    if (type === "date") type = "Date";
    else if (["interger", "float"].includes(type + "")) type = "number";
    return type;
  }

  $fieldSignature(field: Field) {
    let type = this.$fieldType(field);
    if (type === "nested") {
      const nestedModel = $attr(field, ref());
      if (nestedModel) type = this.$className(nestedModel);
    }
    return `${this.$fieldName(field)}: ${type}${
      $attr(field, isArray()) ? "[]" : ""
    }`;
  }

  async select(): Promise<RenderSelection> {
    const modules = this.$seed().$moduleList();
    const models = this.$models(this._where);
    const paths: RenderPath[] = [];

    models.forEach(({ model, module }) => {
      if (paths.some((p) => p.key === this.$key(model))) return;

      const isDto = !!model.$name().match(/dto$/i);
      paths.push({
        key: this.$key(model),
        meta: { isDto },
        path: path.join(
          isDto ? this._dtoDir : this._modelDir,
          this._includeModuleInDir ? Case.kebab(module.$name()) : "",
          this.$fileName(model)
        ),
      });
    });

    return {
      modules,
      paths,
      models: models.map(({ model }) => model),
    };
  }

  async render(): Promise<RenderContent[]> {
    const output: RenderContent[] = [];
    const models = this.$selection().models || [];

    models.forEach((model) => {
      const modelKey = this.$key(model);
      const modelPath = this.$path(modelKey);

      const fieldCursor = "#field-cursor\n";
      const importCursor = "#import-cursor\n";

      const fields = model.$fieldList();
      const importedModels: string[] = [];

      let content = `#import-cursor\nexport class ${this.$className(
        model
      )} {\n${fieldCursor}}`;

      fields.forEach((field) => {
        const fieldSignature = this.$fieldSignature(field);

        if (field.$type() == "nested") {
          const nestedModel = $attr(field, ref());
          if (nestedModel) {
            if (!importedModels.includes(this.$className(nestedModel))) {
              content = writeToCursor(
                importCursor,
                this.$resolveImport(modelPath?.path ?? "", nestedModel),
                content
              );
              importedModels.push(this.$className(nestedModel));
            }
          }
        }

        content = writeToCursor(fieldCursor, `  ${fieldSignature};\n`, content);
      });

      if (importedModels.length > 0)
        content = writeToCursor(importCursor, "\n", content);

      content = closeCursor(fieldCursor, content);
      content = closeCursor(importCursor, content);

      output.push({
        key: modelKey,
        content,
        meta: modelPath?.meta ?? {},
      });
    });

    return output;
  }
}
