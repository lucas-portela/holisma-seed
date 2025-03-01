import { UModel } from "../entities/model";
import { URenderer } from "../entities/renderer";
import { addPackageJsonDependency } from "../helpers/package";
import { $attr } from "../shortcuts/queries";
import { RenderContent, RenderPath, RenderSelection } from "../types/renderer";
import { closeCursor, writeToCursor } from "../utils/rendering";
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
  _schema,
  _ref,
  _unique,
  _index,
  _noId,
  _enum,
  _virtual,
} from "../shortcuts/attributes";
import { UField } from "../entities/field";
import { MissingAttributeError } from "../errors/missing-attribute-error";
import * as path from "path";
import * as Case from "case";

const KEYS = {
  packageJson: "packageJson",
};

export default class TSMongooseSchemaRenderer extends URenderer {
  private _classRenderer!: TSClassRenderer;
  private _where?: (module: UModule, model: UModel) => boolean;
  private _schemaDir = "src/schemas";
  private _includeModuleInDir = true;

  constructor(options?: {
    where?: (module: UModule, model: UModel) => boolean;
    schemaDir?: string;
    includeModuleInDir?: boolean;
  }) {
    super();
    if (options?.where) this._where = options.where;
    if (options?.schemaDir) this._schemaDir = options.schemaDir;
    if (options?.includeModuleInDir)
      this._includeModuleInDir = options.includeModuleInDir;
  }

  $schema(model: UModel): string | null {
    return $attr(model, _schema()) ?? null;
  }

  $key(model: UModel) {
    return this.$schemaName(model);
  }

  $keys(models: UModel[]) {
    return models.map((model) => this.$key(model));
  }

  $schemaName(model: UModel) {
    return Case.pascal(model.$name()) + "Schema";
  }

  $modelName(model: UModel) {
    return Case.pascal(model.$name()) + "Model";
  }

  $fileName(model: UModel, extension = true) {
    return `${Case.kebab(model.$name())}-schema${extension ? ".ts" : ""}`;
  }

  $fieldName(field: UField) {
    return Case.camel(field.$name());
  }

  $fieldType(field: UField) {
    let type = field.$type() + "";
    if (type == "reference") return "mongoose.Schema.ObjectId as any";
    if (["int", "float"].includes(type)) return "Number";
    if (type !== "nested") return Case.pascal(type);
  }

  $fieldDeclaration(field: UField) {
    const type = field.$type() + "";
    let transformedType = this.$fieldType(field);
    let enumModel: UModel | null = null;

    if (type == "nested") {
      const referencedModel = $attr(field, _ref());
      if (referencedModel) {
        let enumDefinition = $attr(referencedModel, _enum());
        if (enumDefinition) {
          transformedType = Case.pascal(
            typeof Object.values(enumDefinition)[0]
          );
          enumModel = referencedModel;
        } else transformedType = this.$schemaName(referencedModel);
      }
    }

    let properties = !!$attr(field, _array())
      ? ` type: [${transformedType}],`
      : ` type: ${transformedType},`;

    if (enumModel) {
      properties += ` enum: ${this._classRenderer.$className(enumModel)},`;
    }

    if (type == "reference") {
      const referencedModel = $attr(field, _ref());
      if (referencedModel) {
        const schema = $attr(referencedModel, _schema());
        if (!schema)
          throw new MissingAttributeError(
            referencedModel.$name(),
            "model",
            "_schema()"
          );
        properties += ` ref: ${this.$modelName(referencedModel)},`;
      }
    }

    const addProperty = (key: string, value: any) => {
      properties += ` ${key}: ${value},`;
    };

    if (!!$attr(field, _required())) addProperty("required", "true");
    if (!!$attr(field, _unique())) addProperty("unique", "true");
    if (!!$attr(field, _index())) addProperty("index", $attr(field, _index()));
    if ($attr(field, _min()) !== null) addProperty("min", $attr(field, _min()));
    if ($attr(field, _max()) !== null) addProperty("max", $attr(field, _max()));
    if ($attr(field, _minLength()) !== null)
      addProperty("minlength", $attr(field, _minLength()));
    if ($attr(field, _maxLength()) !== null)
      addProperty("maxlength", $attr(field, _maxLength()));
    if (!!$attr(field, _in()))
      addProperty("enum", JSON.stringify($attr(field, _in())));
    if (!!$attr(field, _regex()))
      addProperty("match", $attr(field, _regex())!.toString());

    return `  ${this.$fieldName(field)}: {${properties.replace(/,$/, "")} },\n`;
  }

  async select(): Promise<RenderSelection> {
    this._classRenderer = this.$seed().$requireRenderer(this, TSClassRenderer);

    const models = this.$models(this._where).filter(
      ({ model }) =>
        !!this.$schema(model) &&
        !!this._classRenderer.$output(this._classRenderer.$key(model))
    );

    const extraSchemas: string[] = [];

    models.forEach(({ model, module }) => {
      model.$fields().forEach((field) => {
        if (["nested", "reference"].includes(field.$type() + "")) {
          const referencedModel = $attr(field, _ref());
          if (
            referencedModel &&
            !models.some((m) => m.model.$name() === referencedModel.$name()) &&
            !extraSchemas.includes(referencedModel.$name()) &&
            !$attr(referencedModel, _enum())
          ) {
            models.push({ model: referencedModel, module });
            extraSchemas.push(referencedModel.$name());
          }
        }
      });
    });

    const paths: RenderPath[] = [
      {
        key: KEYS.packageJson,
        path: "package.json",
      },
    ];

    models.forEach(({ model, module }) => {
      if (paths.some((p) => p.key === this.$key(model))) return;

      paths.push({
        key: this.$key(model),
        path: path.join(
          this._schemaDir,
          this._includeModuleInDir ? Case.kebab(module.$name()) : "",
          this.$fileName(model)
        ),
      });
    });

    return {
      paths,
      models: models.map(({ model }) => model),
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
              name: "mongoose",
              version: "^8.11.0",
            },
          ]
        ),
      },
    ];
    const models = this.$selection().models || [];

    models.forEach((model) => {
      const modelKey = this._classRenderer.$key(model);
      const schemaKey = this.$key(model);
      const classPath = this._classRenderer.$path(modelKey);
      const schemaPath = this.$path(schemaKey);
      if (!schemaPath || !classPath) return;

      const importCursor = "#import-cursor\n";
      const fieldCursor = "#field-cursor\n";
      const optionsCursor = "#options-cursor\n";

      let content =
        `import mongoose from "mongoose";\nimport { ${this._classRenderer.$className(
          model
        )} } from "${this.$resolveRelativePath(
          schemaPath.path,
          classPath.path
        ).replace(".ts", "")}";\n${importCursor}\n` +
        `export const ${this.$schemaName(
          model
        )} = new mongoose.Schema<${this._classRenderer.$className(
          model
        )}>({\n${fieldCursor}}${optionsCursor});\n\n` +
        `export const ${this.$modelName(
          model
        )} = mongoose.model<${this._classRenderer.$className(model)}>("${$attr(
          model,
          _schema()
        )}", ${this.$schemaName(model)});`;

      const fields = model.$fields();
      const importedSchemas: string[] = [];
      let disableNoExplicityAny = false;

      fields.forEach((field) => {
        const fieldDeclaration = this.$fieldDeclaration(field);
        if (field.$name() == "_id" || $attr(field, _virtual())) return;

        if (["nested", "reference"].includes(field.$type() + "")) {
          const referencedModel = $attr(field, _ref());

          if (referencedModel) {
            if (!importedSchemas.includes(this.$schemaName(referencedModel))) {
              const isRefId = field.$type() == "reference";
              const enumDefinition = $attr(referencedModel, _enum());
              if (isRefId) disableNoExplicityAny = true;

              content = writeToCursor(
                importCursor,
                `import { ${
                  isRefId
                    ? this.$modelName(referencedModel)
                    : enumDefinition
                    ? this._classRenderer.$className(referencedModel)
                    : this.$schemaName(referencedModel)
                } } from "${this.$resolveRelativePath(
                  schemaPath.path,
                  (enumDefinition
                    ? this._classRenderer.$path(
                        this._classRenderer.$key(referencedModel)
                      )
                    : this.$path(this.$key(referencedModel)))!.path
                ).replace(".ts", "")}";\n`,
                content
              );
              importedSchemas.push(this.$schemaName(referencedModel));
            }
          }
        }

        content = writeToCursor(fieldCursor, fieldDeclaration, content);
      });

      if (!!$attr(model, _noId())) {
        content = writeToCursor(optionsCursor, `,\n{ _id: false }\n`, content);
      }

      content = closeCursor(fieldCursor, content);
      content = closeCursor(importCursor, content);
      content = closeCursor(optionsCursor, content);

      if (disableNoExplicityAny) {
        content =
          "/* eslint-disable @typescript-eslint/no-explicit-any */\n\n" +
          content;
      }

      output.push({
        key: schemaKey,
        content,
      });
    });

    return output;
  }
}
