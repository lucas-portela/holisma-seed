import { UModel } from "../entities/model";
import { URenderer } from "../entities/renderer";
import { addPackgeJsonDependency } from "../helpers/json";
import { $attr } from "../shortcuts/queries";
import { RenderContent, RenderPath, RenderSelection } from "../types/renderer";
import { writeToCursor } from "../utils/rendering";
import { UModule } from "../entities/module";
import { TSClassRenderer } from "./ts-class-renderer";
import {
  _isArray,
  _inArray,
  _max,
  _maxLength,
  _min,
  _minLength,
  _notEmpty,
  _notInArray,
  _required,
  _size,
  _matches,
} from "../shortcuts/attributes";

export class TSClassValidatorRenderer extends URenderer {
  private _modelRenderer!: TSClassRenderer;
  private _where?: (module: UModule, model: UModel) => boolean;

  constructor(options?: {
    where?: (module: UModule, model: UModel) => boolean;
  }) {
    super();
    if (options?.where) this._where = options.where;
  }

  async select(): Promise<RenderSelection> {
    const modules = this.$seed().$moduleList();
    const models = this.$models(this._where);
    this._modelRenderer = this.$seed().$requireRenderer(TSClassRenderer);

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
            attr: _required(),
            value: (val: boolean) =>
              val === true ? `@IsDefined()` : `@IsOptional()`,
          },
          {
            attr: _min(),
            value: (val: number) => `@Min(${val})`,
          },
          {
            attr: _max(),
            value: (val: number) => `@Max(${val})`,
          },
          {
            attr: _minLength(),
            value: (val: number) => `@MinLength(${val})`,
          },
          {
            attr: _maxLength(),
            value: (val: number) => `@MaxLength(${val})`,
          },
          {
            attr: _notEmpty(),
            value: (val: boolean) => (val === true ? `@IsNotEmpty()` : ""),
          },
          {
            attr: _size(),
            value: (val: number) => `@Length(${val})`,
          },
          {
            attr: _inArray(),
            value: (val: any[]) => `@IsIn(${JSON.stringify(val)})`,
          },
          {
            attr: _notInArray(),
            value: (val: any[]) => `@IsNotIn(${JSON.stringify(val)})`,
          },
          {
            attr: _isArray(),
            value: (val: boolean) => (val === true ? "" : `@IsArray()`),
          },
          {
            attr: _matches(),
            value: (val: RegExp) => `@Matches(${val.toString()})`,
          },
        ];

        for (let attribute of attributes) {
          const value = $attr(field, attribute.attr.$name());
          if (value !== null) {
            const decorator = (attribute.value as any)(value);
            if (decorator) {
              importValidator(decorator.match(/@(\w+)/)[1]);
              content = writeToCursor(fieldCursor, `  ${decorator}\n`, content);
            }
          }
        }

        let decorator = "";
        let validationOptions = "";
        if ($attr(field, _isArray()) === true)
          validationOptions = "{each: true}";

        if (field.$type() === "string")
          decorator = `@IsString(${validationOptions})`;
        else if (field.$type() === "number")
          decorator = `@IsNumber(${
            validationOptions ? "{}, " + validationOptions : ""
          })`;
        else if (field.$type() === "boolean")
          decorator = `@IsBoolean(${validationOptions})`;
        else if (field.$type() === "date")
          decorator = `@IsDate(${validationOptions})`;
        else if (field.$type() === "integer")
          decorator = `@IsInt(${validationOptions})`;
        else if (field.$type() === "float")
          decorator = `@IsNumber(${
            validationOptions ? "{}, " + validationOptions : ""
          })`;
        else if (field.$type() === "nested")
          decorator = `@ValidateNested(${validationOptions})`;

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
