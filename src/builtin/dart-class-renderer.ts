import * as Case from "case";
import * as path from "path";
import { UModel } from "../entities/model";
import { URenderer } from "../entities/renderer";
import { $attr } from "../shortcuts/queries";
import { RenderContent, RenderPath, RenderSelection } from "../types/renderer";
import { _array, _enum, _ref, _required } from "../shortcuts/attributes";
import { UModule } from "../entities/module";
import { UField } from "../entities/field";

export default class DartClassRenderer extends URenderer {
  private _modelDir = "lib/models";
  private _dtoDir = "lib/dtos";
  private _enumDir = "lib/enums";
  private _includeModuleInDir = true;
  private _where?: (module: UModule, model: UModel) => boolean;

  constructor(options?: {
    modelDir?: string;
    dtoDir?: string;
    enumDir?: string;
    includeModuleInDir?: boolean;
    where?: (module: UModule, model: UModel) => boolean;
  }) {
    super();
    if (options?.modelDir) this._modelDir = options.modelDir;
    if (options?.dtoDir) this._dtoDir = options.dtoDir;
    if (options?.enumDir) this._enumDir = options.enumDir;
    if (options?.includeModuleInDir !== undefined)
      this._includeModuleInDir = options.includeModuleInDir;
    this._where = options?.where;
  }

  $isDto(model: UModel) {
    const output = this.$output(model.$name());
    return output?.meta?.isDto ?? false;
  }

  $resolveImport(from: string, model: UModel): string {
    const modelPath = this.$path(this.$className(model));
    if (!modelPath?.path) return "";

    const fromDir = path.dirname(from);
    const toDir = path.dirname(modelPath.path);
    const relativePath = path.relative(fromDir, toDir);
    const fileName = this.$fileName(model, false);
    const importPath = path.join(relativePath, fileName);
    const normalizedPath = importPath.split(path.sep).join("/");

    return `import '${normalizedPath}.dart';\n`;
  }

  $key(model: UModel) {
    return this.$className(model);
  }

  $className(model: UModel) {
    return Case.pascal(model.$name());
  }

  $fileName(model: UModel, extension = true) {
    return `${Case.snake(model.$name())}${extension ? ".dart" : ""}`;
  }

  $fieldName(field: UField) {
    const nameParts = field.$name().match(/([^A-Za-z]+)(.+)/);
    return nameParts
      ? nameParts[1] + Case.camel(nameParts[2])
      : Case.camel(field.$name());
  }

  $fieldType(field: UField): string {
    let type: string;

    switch (field.$type()) {
      case "date":
        type = "DateTime";
        break;
      case "reference":
      case "string":
        type = "String";
        break;
      case "int":
        type = "int";
        break;
      case "float":
        type = "double";
        break;
      case "boolean":
        type = "bool";
        break;
      case "nested": {
        const nestedModel = $attr(field, _ref());
        type = nestedModel ? this.$className(nestedModel) : "dynamic";
        break;
      }
      default:
        type = field.$type().toString();
    }

    if ($attr(field, _array())) {
      type = `List<${type}>`;
    }

    if (!$attr(field, _required())) {
      type += "?";
    }

    return type;
  }

  private toDartValue(value: any): string {
    if (typeof value === "string") return `'${value.replace(/'/g, "\\'")}'`;
    if (typeof value === "number") return value.toString();
    if (typeof value === "boolean") return value ? "true" : "false";
    return JSON.stringify(value);
  }

  async select(): Promise<RenderSelection> {
    const models = this.$models(this._where);
    const paths: RenderPath[] = [];

    models.forEach(({ model, module }) => {
      if (paths.some((p) => p.key === this.$key(model))) return;

      const isDto = !!model.$name().match(/dto$/i);
      const isEnum = !!$attr(model, _enum());
      paths.push({
        key: this.$key(model),
        meta: { isDto, isEnum },
        path: path.join(
          isDto ? this._dtoDir : isEnum ? this._enumDir : this._modelDir,
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
    const output: RenderContent[] = [];
    const models = this.$selection().models || [];

    for (const model of models) {
      const modelKey = this.$key(model);
      const modelPath = this.$path(modelKey);

      if (!modelPath) continue;

      let content = "";
      const className = this.$className(model);
      const enumDefinition = $attr(model, _enum());

      if (enumDefinition) {
        const entries = Object.keys(enumDefinition).map((key) => {
          const entryName = Case.camel(key);
          const value = enumDefinition[key];
          return `${entryName}(${this.toDartValue(value)})`;
        });

        const firstValue = Object.values(enumDefinition)[0];
        let valueType = "dynamic";
        if (typeof firstValue === "string") {
          valueType = "String";
        } else if (typeof firstValue === "number") {
          valueType = Number.isInteger(firstValue) ? "int" : "double";
        } else if (typeof firstValue === "boolean") {
          valueType = "bool";
        }

        content =
          `enum ${className} {\n  ${entries.join(",\n  ")};\n\n` +
          `  final ${valueType} value;\n\n` +
          `  const ${className}(this.value);\n}`;
      } else {
        const fields = model.$fields();
        let imports = "";
        const importedModels: string[] = [];
        let fieldDeclarations = "";
        const constructorParams: string[] = [];

        fields.forEach((field) => {
          const fieldName = this.$fieldName(field);
          const fieldType = this.$fieldType(field);
          const isRequired = $attr(field, _required());

          // Handle nested models
          if (field.$type() === "nested") {
            const nestedModel = $attr(field, _ref());
            if (nestedModel) {
              const nestedClassName = this.$className(nestedModel);
              if (!importedModels.includes(nestedClassName)) {
                imports += this.$resolveImport(modelPath.path, nestedModel);
                importedModels.push(nestedClassName);
              }
            }
          }

          // Build field declaration
          fieldDeclarations += `  final ${fieldType} ${fieldName};\n`;

          // Build constructor parameter
          constructorParams.push(
            `    ${isRequired ? "required " : ""}this.${fieldName},`
          );
        });

        const constructor = constructorParams.length
          ? `\n  ${className}({\n${constructorParams.join("\n")}\n  });`
          : "";

        content = `${imports}class ${className} {\n${fieldDeclarations}${constructor}\n}`;
      }

      output.push({
        key: modelKey,
        content,
        meta: modelPath.meta ?? {},
      });
    }

    return output;
  }
}
