import { Model } from "../entities/model";
import { Renderer } from "../entities/renderer";
import { Seed } from "../entities/seed";
import { $attr } from "../shortcuts/queries";
import {
  RendererFileInput,
  RendererOutput,
  RendererSelection,
} from "../types/renderer";
import Case from "case";
import { closeCursor, writeToCursor } from "../utils/rendering";
import { isArray, ref, required } from "../shortcuts/attributes";
import { field } from "../shortcuts/entities";
import { Attribute } from "../entities/attribute";
import path from "path";
import { fieldInstantiator } from "../helpers/instantiators";
import { Module } from "../entities/module";
import { Field } from "../entities/field";

export class ModelRenderer extends Renderer {
  private _modelDir = "src/models";
  private _dtoDir = "src/dto";
  private _where?: (module: Module, model: Model) => boolean;

  constructor(options?: {
    modelDir?: string;
    dtoDir?: string;
    where?: (module: Module, model: Model) => boolean;
  }) {
    super();
    if (options?.modelDir) this._modelDir = options.modelDir;
    if (options?.dtoDir) this._dtoDir = options.dtoDir;
    if (options?.where) this._where = options.where;
  }

  private _isDtoModel(model: Model) {
    return !!model.$name().match(/dto$/i);
  }

  private _modelImport(
    currentModel: Model,
    model: Model,
    selection: RendererSelection
  ): string {
    if (!selection.files) return "";
    const currentModelFilePath = selection.files[
      ModelRenderer.modelClassName(currentModel)
    ]
      .split("/")
      .slice(-3)
      .join("/");
    const modelFilePath = selection.files[ModelRenderer.modelClassName(model)]
      .split("/")
      .slice(-3)
      .join("/");

    const currentModelIsDto = this._isDtoModel(currentModel);
    const modelIsDto = this._isDtoModel(model);

    const sameTypeOfModel = currentModelIsDto == modelIsDto;
    const sameModule =
      sameTypeOfModel &&
      path.dirname(currentModelFilePath) == path.dirname(modelFilePath);

    const fileName = ModelRenderer.modelFileName(model).replace(".ts", "");

    if (sameModule)
      return `import { ${ModelRenderer.modelClassName(
        model
      )} } from "./${fileName}";\n`;
    else {
      if (sameTypeOfModel)
        return `import { ${ModelRenderer.modelClassName(model)} } from "../${
          modelFilePath.split("/")[1]
        }/${fileName}";\n`;
      else
        return `import { ${ModelRenderer.modelClassName(
          model
        )} } from "../../${modelFilePath
          .split("/")
          .slice(0, 2)
          .join("/")}/${fileName}";\n`;
    }
  }

  static modelClassName(model: Model) {
    return Case.pascal(model.$name());
  }

  static modelFileName(model: Model) {
    return `${Case.kebab(model.$name())}.ts`;
  }

  static fieldName(field: Field) {
    return Case.camel(field.$name());
  }

  static fieldType(field: Field) {
    let type = field.$type();
    if (type === "date") type = "Date";
    else if (["interger", "float"].includes(type + "")) type = "number";
    return type;
  }

  static fieldSignature(field: Field) {
    let type = ModelRenderer.fieldType(field);
    if (type === "nested") {
      const nestedModel = $attr(field, ref());
      if (nestedModel) type = ModelRenderer.modelClassName(nestedModel);
    }
    return `  ${ModelRenderer.fieldName(field)}: ${type}${
      $attr(field, isArray()) ? "[]" : ""
    };\n`;
  }

  async select(seed: Seed): Promise<RendererSelection> {
    const modules = seed.$moduleList();
    const files: RendererFileInput = {};
    const modelsWithModules = this.findModels(seed, this._where);

    modelsWithModules.forEach(({ model, module }) => {
      const isDto = this._isDtoModel(model);
      files[ModelRenderer.modelClassName(model)] = path.join(
        isDto ? this._dtoDir : this._modelDir,
        `${Case.kebab(module.$name())}/${ModelRenderer.modelFileName(model)}`
      );
    });

    return {
      modules,
      files,
      models: modelsWithModules.map(({ model }) => model),
    };
  }

  async render(
    seed: Seed,
    selection: RendererSelection,
    files: RendererFileInput
  ): Promise<RendererOutput> {
    const renderedFiles: RendererOutput = {};

    selection.models?.forEach((model) => {
      const fieldCursor = "#field-cursor\n";
      const importCursor = "#import-cursor\n";

      let content = `#import-cursor\nexport class ${ModelRenderer.modelClassName(
        model
      )} {\n${fieldCursor}}`;

      const fields = model.$fieldList();
      const importedModels: string[] = [];
      fields.forEach((field) => {
        const fieldSignature = ModelRenderer.fieldSignature(field);

        if (field.$type() == "nested") {
          const nestedModel = $attr(field, ref());
          if (nestedModel) {
            if (
              !importedModels.includes(
                ModelRenderer.modelClassName(nestedModel)
              )
            ) {
              content = writeToCursor(
                importCursor,
                this._modelImport(model, nestedModel, selection),
                content
              );
              importedModels.push(ModelRenderer.modelClassName(nestedModel));
            }
          }
        }

        content = writeToCursor(fieldCursor, fieldSignature, content);
      });
      if (importedModels.length > 0)
        content = writeToCursor(importCursor, "\n", content);
      content = closeCursor(fieldCursor, content);
      content = closeCursor(importCursor, content);
      renderedFiles[ModelRenderer.modelClassName(model)] = content;
    });

    return renderedFiles;
  }
}
