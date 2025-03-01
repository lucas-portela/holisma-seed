import { UModel } from "../entities/model";
import { URenderer } from "../entities/renderer";
import { addPackageJsonDependency } from "../helpers/package";
import { $attr } from "../shortcuts/queries";
import { RenderContent, RenderPath, RenderSelection } from "../types/renderer";
import { writeToCursor } from "../utils/rendering";
import { UModule } from "../entities/module";
import TSClassRenderer from "./ts-class-renderer";
import {
  _array,
  _in,
  _max,
  _maxLength,
  _min,
  _minLength,
  _notEmpty,
  _notIn,
  _required,
  _size,
  _regex,
  _enum,
  _ref,
} from "../shortcuts/attributes";

const KEYS = {
  packageJson: "packageJson",
};

export default class TSClassValidatorRenderer extends URenderer {
  private _classRenderer!: TSClassRenderer;
  private _where?: (module: UModule, model: UModel) => boolean;

  constructor(options?: {
    where?: (module: UModule, model: UModel) => boolean;
  }) {
    super();
    if (options?.where) this._where = options.where;
  }

  async select(): Promise<RenderSelection> {
    this._classRenderer = this.$seed().$requireRenderer(this, TSClassRenderer);

    const models = this.$models(this._where)
      .map(({ model }) => model)
      .filter(
        (model) =>
          !!this._classRenderer.$output(this._classRenderer.$key(model))
      );

    const paths: RenderPath[] = [
      {
        key: KEYS.packageJson,
        path: "package.json",
      },
      ...this._classRenderer.$paths(models),
    ];

    return {
      paths,
      models,
    };
  }

  async render(): Promise<RenderContent[]> {
    const output: RenderContent[] = [
      {
        key: KEYS.packageJson,
        content: addPackageJsonDependency(
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
      if (!!$attr(model, _enum())) return;
      const modelKey = this._classRenderer.$key(model);
      let content = this.$content(modelKey)?.content || "";
      if (!content) return;

      const fields = model.$fields();

      const importedValidators: string[] = [];
      const importValidator = (validator?: string) => {
        if (!validator) return;
        if (!importedValidators.includes(validator))
          importedValidators.push(validator);
      };
      for (let field of fields) {
        const fieldCursor = `  ${this._classRenderer.$fieldSignature(
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
            attr: _in(),
            value: (val: any[]) => `@IsIn(${JSON.stringify(val)})`,
          },
          {
            attr: _notIn(),
            value: (val: any[]) => `@IsNotIn(${JSON.stringify(val)})`,
          },
          {
            attr: _array(),
            value: (val: boolean) => (val === true ? `@IsArray()` : ""),
          },
          {
            attr: _regex(),
            value: (val: RegExp) => `@Matches(${val.toString()})`,
          },
        ];

        for (let attribute of attributes) {
          // if (attribute.attr.$name() == "array") debugger;
          const value = $attr<any>(field, attribute.attr);
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
        if ($attr(field, _array()) === true) validationOptions = "{each: true}";

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
        else if (field.$type() === "int")
          decorator = `@IsInt(${validationOptions})`;
        else if (field.$type() === "float")
          decorator = `@IsNumber(${
            validationOptions ? "{}, " + validationOptions : ""
          })`;
        else if (field.$type() === "nested") {
          const nestedModel = $attr(field, _ref());
          if (nestedModel) {
            if ($attr(nestedModel, _enum())) {
              decorator = `@IsEnum(${this._classRenderer.$className(
                nestedModel
              )}${validationOptions ? ", " + validationOptions : ""})`;
            } else decorator = `@ValidateNested(${validationOptions})`;
          }
        }

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
