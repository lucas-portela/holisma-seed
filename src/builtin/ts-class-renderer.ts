import * as Case from "case";
import * as path from "path";
import { UModel } from "../entities/model";
import { URenderer } from "../entities/renderer";
import { $attr } from "../shortcuts/queries";
import { RenderContent, RenderPath, RenderSelection } from "../types/renderer";
import { closeCursor, writeToCursor } from "../utils/rendering";
import { _array, _enum, _ref, _required } from "../shortcuts/attributes";
import { UModule } from "../entities/module";
import { UField } from "../entities/field";

export default class TSClassRenderer extends URenderer {
  private _entityDir = "src/entities";
  private _dtoDir = "src/dtos";
  private _enumDir = "src/types";
  private _includeModuleInDir = true;
  private _where?: (module: UModule, model: UModel) => boolean;

  constructor(options?: {
    modelDir?: string;
    dtoDir?: string;
    includeModuleInDir?: boolean;
    where?: (module: UModule, model: UModel) => boolean;
  }) {
    super();
    if (options?.modelDir) this._entityDir = options.modelDir;
    if (options?.dtoDir) this._dtoDir = options.dtoDir;
    if (options?.includeModuleInDir)
      this._includeModuleInDir = options.includeModuleInDir;
    if (options?.where) this._where = options.where;
  }

  $isDto(model: UModel) {
    const output = this.$output(model.$name());
    if (output) return !!output.meta?.isDto;
    return null;
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

    return `import { ${this.$className(model)} } from '${normalizedPath}';\n`;
  }

  $key(model: UModel) {
    return this.$className(model);
  }

  $keys(models: UModel[]) {
    return models.map((model) => this.$key(model));
  }

  $paths(models?: UModel[]) {
    let paths = super.$paths();
    if (models)
      paths = paths.filter((p) => models.some((m) => p.key === this.$key(m)));
    return paths;
  }

  $className(model: UModel) {
    return Case.pascal(model.$name());
  }

  $fileName(model: UModel, extension = true) {
    return `${Case.kebab(model.$name())}${extension ? ".ts" : ""}`;
  }

  $fieldName(field: UField) {
    let nameParts = field.$name().match(/([^A-Za-z]+)(.+)/);
    if (nameParts) return nameParts[1] + Case.camel(nameParts[2]);
    return Case.camel(field.$name());
  }

  $fieldType(field: UField) {
    let type = field.$type() + "";
    if (type === "date") type = "Date";
    else if (type === "reference") type = "string";
    else if (["int", "float"].includes(type)) type = "number";
    return type;
  }

  $fieldSignature(field: UField) {
    let type = this.$fieldType(field);
    if (type === "nested") {
      const nestedModel = $attr(field, _ref());
      if (nestedModel) type = this.$className(nestedModel);
    }
    return `${this.$fieldName(field)}${
      !$attr(field, _required()) ? "?" : ""
    }: ${type}${$attr(field, _array()) ? "[]" : ""}`;
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
          isDto ? this._dtoDir : isEnum ? this._enumDir : this._entityDir,
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

    models.forEach((model) => {
      const modelKey = this.$key(model);
      const modelPath = this.$path(modelKey);

      if (!modelPath) return;

      let content = "";

      const enumDefinition = $attr(model, _enum());
      if (enumDefinition) {
        const enumCursor = "#enum-cursor\n";

        content = `export enum ${this.$className(model)} {\n${enumCursor}}`;

        Object.keys(enumDefinition).forEach((key) => {
          content = writeToCursor(
            enumCursor,
            `  ${key} = ${JSON.stringify(enumDefinition[key])},\n`,
            content
          );
        });

        content = closeCursor(enumCursor, content);
      } else {
        const fieldCursor = "#field-cursor\n";
        const importCursor = "#import-cursor\n";
        const fromJsonCursor = "#from-json-cursor\n";
        const toJsonCursor = "#to-json-cursor\n";

        content = `${importCursor}export class ${this.$className(
          model
        )} {\n${fieldCursor}${fromJsonCursor}${toJsonCursor}\n}`;

        const fields = model.$fields();
        const importedModels: string[] = [];

        fields.forEach((field) => {
          const fieldSignature = this.$fieldSignature(field);

          if (field.$type() == "nested") {
            const nestedModel = $attr(field, _ref());
            if (nestedModel) {
              if (!importedModels.includes(this.$className(nestedModel))) {
                content = writeToCursor(
                  importCursor,
                  this.$resolveImport(modelPath.path ?? "", nestedModel),
                  content
                );
                importedModels.push(this.$className(nestedModel));
              }
            }
          }

          content = writeToCursor(
            fieldCursor,
            `  ${fieldSignature};\n`,
            content
          );
        });

        let fromJsonMethod = `  static fromJson(json: Record<string, any>): ${this.$className(
          model
        )} {\n    const instance = new ${this.$className(model)}();\n`;
        let toJsonMethod = `  toJson(): Record<string, any> {\n    return {\n`;
        fields.forEach((field) => {
          const fieldName = this.$fieldName(field);
          const type = field.$type();

          if (type === "date") {
            // For Date fields, assume the JSON value is an ISO string.
            fromJsonMethod += `      if(json.${fieldName}) instance.${fieldName} =  new Date(json.${fieldName});\n`;
            toJsonMethod += `      ${fieldName}: this.${fieldName} ? this.${fieldName}.toISOString() : undefined,\n`;
          } else if (type === "nested") {
            // For nested objects, call the nested type's fromJson/toJson.
            const nestedModel = $attr(field, _ref());
            const isEnum = !nestedModel || !!$attr(nestedModel, _enum());
            if (nestedModel && !isEnum) {
              if ($attr(field, _array())) {
                // Nested array: map each item.
                fromJsonMethod += `      if(json.${fieldName}) instance.${fieldName} =json.${fieldName}.map((item: any) => ${this.$className(
                  nestedModel
                )}.fromJson(item));\n`;
                toJsonMethod += `      ${fieldName}: this.${fieldName} ? this.${fieldName}.map((item: any) => item.toJson()) : undefined,\n`;
              } else {
                // Single nested object.
                fromJsonMethod += `      if(json.${fieldName}) instance.${fieldName} = ${this.$className(
                  nestedModel
                )}.fromJson(json.${fieldName});\n`;
                toJsonMethod += `      ${fieldName}: this.${fieldName} ? this.${fieldName}.toJson() : undefined,\n`;
              }
            }
          } else {
            // For primitives and other types, assign directly.
            fromJsonMethod += `      instance.${fieldName} = json.${fieldName};\n`;
            toJsonMethod += `      ${fieldName}: this.${fieldName},\n`;
          }
        });

        fromJsonMethod += `      return instance;\n  }\n`;
        toJsonMethod += `    };\n  }\n`;

        content = writeToCursor(fromJsonCursor, fromJsonMethod, content);
        content = writeToCursor(toJsonCursor, toJsonMethod, content);

        if (importedModels.length > 0)
          content = writeToCursor(importCursor, "\n", content);

        content = closeCursor(fieldCursor, content);
        content = closeCursor(importCursor, content);
        content = closeCursor(fromJsonCursor, content);
        content = closeCursor(toJsonCursor, content);
      }

      if (content)
        output.push({
          key: modelKey,
          content,
          meta: modelPath.meta ?? {},
        });
    });

    return output;
  }
}
