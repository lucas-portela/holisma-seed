import { Model } from "../entities/model";
import { Renderer } from "../entities/renderer";
import { addPackgeJsonDependency } from "../helpers/json";
import { $attr } from "../shortcuts/queries";
import { RenderContent, RenderPath, RenderSelection } from "../types/renderer";
import { writeToCursor } from "../utils/rendering";
import { Module } from "../entities/module";
import { TSModelRenderer } from "./ts-model-renderer";
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

export class TSModelValidatorRenderer extends Renderer {
  private _modelRenderer!: TSModelRenderer;
  private _where?: (module: Module, model: Model) => boolean;

  constructor(options?: { where?: (module: Module, model: Model) => boolean }) {
    super();
    if (options?.where) this._where = options.where;
  }

  async select(): Promise<RenderSelection> {
    const modules = this.$seed().$moduleList();
    const models = this.$models(this._where);
    this._modelRenderer = this.$seed().$requireRenderer(TSModelRenderer);

    const paths: RenderPath[] = [
      {
        key: "packageJson",
        path: "package.json",
      },
      ...this._modelRenderer.$pathList(),
    ];

    return {
      modules,
      paths,
      models: models.map(({ model }) => model),
    };
  }

  async render(): Promise<RenderContent[]> {
    const output: RenderContent[] = [
      {
        key: "packageJson",
        content: addPackgeJsonDependency(
          this.$content("packageJson")!.content,
          [
            {
              name: "class-validator",
              version: "^0.14.1",
            },
          ]
        ),
      },
    ];
    const models = this.$selection().models || [];

    models.forEach((model) => {
      const modelKey = this._modelRenderer.$key(model);
      let content = this.$content(modelKey)?.content || "";
      if (!content) return;

      const fields = model.$fieldList();

      const importedValidators: string[] = [];
      const importValidator = (validator?: string) => {
        if (!validator) return;
        if (!importedValidators.includes(validator))
          importedValidators.push(validator);
      };
      for (let field of fields) {
        const fieldCursor = `  ${this._modelRenderer.$fieldSignature(
          field
        )};\n`;
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

      output.push({
        key: modelKey,
        content,
      });
    });

    return output;
  }
}
