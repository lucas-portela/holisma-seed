import { Model } from "../entities/model";
import { Renderer } from "../entities/renderer";
import { Seed } from "../entities/seed";
import { addPackgeJsonDependency } from "../helpers/json";
import { $attr, $findModules } from "../shortcuts/queries";
import {
  RendererFileInput,
  RendererOutput,
  RendererSelectedFiles,
  RendererSelection,
} from "../types/renderer";
import Case from "case";
import { closeCursor, writeToCursor } from "../utils/rendering";
import { attr, field } from "../shortcuts/entities";
import { Attribute } from "../entities/attribute";
import path from "path";
import { attrInstantiator, fieldInstantiator } from "../helpers/instantiators";
import { Module } from "../entities/module";
import { ModelRenderer } from "./model-renderer";
import {
  isArray,
  inArray,
  max,
  maxLength,
  min,
  minLength,
  notEmpty,
  notInArray,
  required,
  size,
} from "../shortcuts/attributes";

export class ModelValidatorRenderer extends Renderer {
  private _modelFiles: RendererSelectedFiles = {};
  private _where?: (module: Module, model: Model) => boolean;

  constructor(options: {
    modelFiles: RendererOutput;
    where?: (module: Module, model: Model) => boolean;
  }) {
    super();
    this._modelFiles = options.modelFiles;
    if (options?.where) this._where = options.where;
  }

  async select(seed: Seed): Promise<RendererSelection> {
    const modules = seed.$moduleList();
    const files: RendererFileInput = {
      packageJson: "package.json",
      ...this._modelFiles,
    };
    const modelsWithModules = this.findModels(seed, this._where);

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
    const packageJson = addPackgeJsonDependency(files.packageJson, [
      {
        name: "class-validator",
        version: "^0.14.1",
      },
    ]);

    const renderedFiles: RendererOutput = {};

    selection.models?.forEach((model) => {
      let content = files[ModelRenderer.modelClassName(model)];
      if (!content) return;

      const fields = model.$fieldList();

      const importedValidators: string[] = [];
      const importValidator = (validator?: string) => {
        if (!validator) return;
        if (!importedValidators.includes(validator))
          importedValidators.push(validator);
      };
      for (let field of fields) {
        const fieldCursor = ModelRenderer.fieldSignature(field);
        const attributes = [
          {
            attr: required(),
            value: (val: boolean) => (!val ? `@IsOptional()` : `@IsDefined()`),
          },
          {
            attr: min(),
            value: (val: number) => `@Min(${val})`,
          },
          {
            attr: max(),
            value: (val: number) => `@Max(${val})`,
          },
          {
            attr: minLength(),
            value: (val: number) => `@MinLength(${val})`,
          },
          {
            attr: maxLength(),
            value: (val: number) => `@MaxLength(${val})`,
          },
          {
            attr: notEmpty(),
            value: (val: number) => (val ? `@IsNotEmpty()` : ""),
          },
          {
            attr: size(),
            value: (val: number) => `@Length(${val})`,
          },
          {
            attr: inArray(),
            value: (val: any[]) => `@IsIn(${JSON.stringify(val)})`,
          },
          {
            attr: notInArray(),
            value: (val: any[]) => `@IsNotIn(${JSON.stringify(val)})`,
          },
          {
            attr: isArray(),
            value: (val: boolean) => (val ? `@IsArray()` : ""),
          },
        ];

        for (let attribute of attributes) {
          const value = $attr(field, attribute.attr.$name());
          if (value !== null) {
            const decorator = (attribute.value as any)(value);
            if (decorator) importValidator(decorator.match(/@(\w+)/)[1]);
            content = writeToCursor(fieldCursor, `  ${decorator}\n`, content);
          }
        }

        let decorator = "";
        if (field.$type() === "string") decorator = `@IsString()`;
        else if (field.$type() === "number") decorator = `@IsNumber()`;
        else if (field.$type() === "boolean") decorator = `@IsBoolean()`;
        else if (field.$type() === "date") decorator = `@IsDate()`;
        else if (field.$type() === "integer") decorator = `@IsInt()`;
        else if (field.$type() === "float") decorator = `@IsNumber()`;
        else if (field.$type() === "nested") decorator = `@ValidateNested()`;

        if (decorator) {
          importValidator(decorator.match(/@(\w+)/)?.[1]);
          content = writeToCursor(fieldCursor, `  ${decorator}\n`, content);
        }

        if (!content.includes(fieldCursor + "}"))
          content = content.replace(fieldCursor, fieldCursor + `\n`);
      }

      content =
        `import {\n${importedValidators
          .map((v) => "  " + v + ",\n")
          .join("")
          .replace(/,\n$/, "\n")}} from "class-validator";\n` +
        (!content.match("^import") ? "\n" : "") +
        content;

      renderedFiles[ModelRenderer.modelClassName(model)] = content;
    });

    return {
      packageJson,
      ...renderedFiles,
    };
  }
}
