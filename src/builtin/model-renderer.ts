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
import { max, min, required } from "../shortcuts/attributes";

export class ModelRenderer extends Renderer {
  async select(seed: Seed): Promise<RendererSelection> {
    const modules = seed.$moduleList();
    const files: RendererFileInput = {
      packageJson: "package.json",
    };
    const models: Model[] = [];

    modules.forEach((mod) => {
      const foundModels: Model[] = [];
      mod.$featureList().forEach((feature) => {
        const input = feature.$input();
        const output = feature.$output();
        if (
          input &&
          !foundModels.some((model) => model.$name() == input.$name())
        )
          foundModels.push(input);
        if (
          output &&
          !foundModels.some((model) => model.$name() == output.$name())
        )
          foundModels.push(output);
      });
      foundModels.forEach((model) => {
        files[model.$name() + "-model"] = `src/models/${Case.kebab(
          mod.$name()
        )}/${Case.snake(model.$name())}.ts`;
      });
      models.push(...foundModels);
    });

    return {
      modules,
      files,
      models,
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
      const fieldCursor = "#field-cursor";

      let content = `export class ${Case.pascal(
        model.$name()
      )} {\n${fieldCursor}\n}`;

      const fields = model.$fieldList();
      fields.forEach((field) => {
        if (field.$type() == "nested")
          content = writeToCursor(
            fieldCursor,
            `\t${Case.camel(field.$name())}${
              !$attr(field, required()) ? "?" : ""
            }: ${field.$type()};\n`,
            content
          );
        else
          content = writeToCursor(
            fieldCursor,
            `\t${Case.camel(field.$name())}${
              !$attr(field, required()) ? "?" : ""
            }: ${field.$type()};\n`,
            content
          );
      });
      content = closeCursor(fieldCursor, content);
      renderedFiles[model.$name() + "-model"] = content;
    });

    return {
      packageJson,
      ...renderedFiles,
    };
  }
}
