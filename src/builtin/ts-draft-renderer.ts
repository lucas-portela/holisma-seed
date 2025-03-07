import * as Case from "case";
import * as path from "path";
import { UModel } from "../entities/model";
import { URenderer } from "../entities/renderer";
import { $attr } from "../shortcuts/queries";
import { RenderContent, RenderPath, RenderSelection } from "../types/renderer";
import { closeCursor, writeToCursor } from "../utils/rendering";
import {
  _array,
  _enum,
  _ref,
  _required,
  _rootModule,
} from "../shortcuts/attributes";
import { UModule } from "../entities/module";
import { UField } from "../entities/field";
import { UAttribute } from "../entities/attribute";
import { UFeature } from "../entities/feature";

const KEYS = {
  draft: "draft",
};

export default class TSDraftRenderer extends URenderer {
  private _draftPath = "src/core/draft.ts";

  constructor(options?: { draftPath?: string }) {
    super();
    if (options?.draftPath) this._draftPath = options.draftPath;
  }

  async select(): Promise<RenderSelection> {
    const models = this.$models();
    const features = this.$features();
    const modules = this.$modules();
    const paths: RenderPath[] = [
      {
        key: KEYS.draft,
        path: this._draftPath,
      },
    ];

    return {
      paths,
      modules,
      features: features.map(({ feature }) => feature),
      models: models.map(({ model }) => model),
    };
  }

  async render(): Promise<RenderContent[]> {
    const output: RenderContent[] = [];
    const models = this.$selection().models || [];
    const features = this.$selection().features || [];
    const modules = this.$selection().modules || [];

    let content = `export enum MODULES {\n${modules
      .map((mod) => `  ${Case.pascal(mod.$name())} = "${mod.$name()}",`)
      .join("\n")}\n};\n\nexport enum FEATURES {\n${features
      .map(
        (feature) => `  ${Case.pascal(feature.$name())} = "${feature.$name()}",`
      )
      .join("\n")}\n};\n\nexport enum MODELS {\n${models
      .map((model) => `  ${Case.pascal(model.$name())} = "${model.$name()}",`)
      .join("\n")}\n};\n\n`;

    const attrToStr = (attributes: UAttribute<any>[], tab = "  ") => {
      if (attributes.length == 0) return `[]`;
      return (
        "[\n" +
        attributes
          .filter((a) => !["enum", "root-module", "ref"].includes(a.$name()))
          .map((a) => {
            let value = "";
            if (a.$value()) {
              if (a.$name() == "regex") {
                value = a.$value().toString();
              } else
                value = JSON.stringify(a.$value(), null, 2)
                  .split("\n")
                  .map((line, i) => (i > 0 ? tab + "  " : "") + line)
                  .join("\n");
            }
            return value
              ? `${tab}{\n${tab}  name: "${a.$name()}"${
                  ",\n" + tab + "  value: " + value
                }\n${tab}},`
              : `${tab}{ name: "${a.$name()}" },`;
          })
          .join("\n") +
        `\n${tab.slice(2)}]`
      );
    };

    const modelToStr = (model: UModel, tab = "  ") => {
      let fields = "";
      let enumValues = "";
      let enumAttr = $attr(model, _enum());
      let rootModule = $attr(model, _rootModule());
      if (!enumAttr) {
        fields = `fields: [\n${model
          .$fields()
          .map((field) => {
            let ref = "";
            const refAttr = $attr(field, _ref());
            if (refAttr) {
              ref = `MODELS.${Case.pascal(refAttr.$name())}`;
            }
            return `${tab}    {\n${tab}      name: "${field.$name()}",\n${tab}      type: "${field.$type()}",\n${
              ref ? `${tab}      ref: ${ref},\n` : ""
            }${tab}      attributes: ${attrToStr(
              field.$attributes(),
              tab + "        "
            )},\n${tab}    },`;
          })
          .join("\n")}\n${tab}  ]`;
      } else {
        enumValues = `enum: {\n${Object.keys(enumAttr)
          .map(
            (k) => `${tab}    "${k}": ${JSON.stringify((enumAttr as any)[k])},`
          )
          .join("\n")}\n${tab}  }`;
      }
      return `{\n${tab}  name: "${model.$name()}",\n${
        !!rootModule
          ? `${tab}  module: MODULES.${Case.pascal(rootModule.$name())},`
          : ""
      }\n${tab}  attributes: ${attrToStr(
        model.$attributes(),
        tab + "    "
      )},\n${tab}  ${fields || enumValues},\n${tab}}`;
    };

    const featureToStr = (model: UFeature, tab = "  ") => {
      let input = "";
      let output = "";
      const modelInput = model.$input();
      const modelOutput = model.$output();
      if (modelInput) {
        input = `\n${tab}  input: uModels["${modelInput.$name()}"],`;
      }
      if (modelOutput) {
        output = `\n${tab}  output: uModels["${modelOutput.$name()}"],`;
      }
      return `{\n${tab}  name: "${model.$name()}",\n${tab}  attributes: ${attrToStr(
        model.$attributes(),
        tab + "    "
      )},${input}${output}\n  }`;
    };

    content += `export const uModel = (name: MODELS) =>\n  uModels[name as keyof typeof uModels];`;
    content += `export const uFeature = (name: FEATURES) =>\n  uFeatures[name as keyof typeof uFeatures];`;
    content += `export const uModule = (name: MODULES) =>\n  uModules[name as keyof typeof uModules];`;

    content += `const uModels = {\n${models
      .map((model) => `  "${model.$name()}": ` + modelToStr(model, "  ") + ",")
      .join("\n")}\n};\n\n`;

    content += `const uFeatures = {\n${features
      .map(
        (feature) =>
          `  "${feature.$name()}": ` + featureToStr(feature, "  ") + ","
      )
      .join("\n")}\n};\n\n`;

    content += `const uModules = {\n${modules
      .map(
        (mod) =>
          `  "${mod.$name()}": {\n    name: "${mod.$name()}",\n    attributes: ${attrToStr(
            mod.$attributes(),
            "      "
          )},\n    features: {\n${mod
            .$features()
            .map(
              (feature) =>
                `      "${feature.$name()}": uFeatures["${feature.$name()}"],`
            )
            .join("\n")}\n    },\n    models: {\n${models
            .filter((model) => $attr(model, _rootModule()) == mod)
            .map(
              (model) =>
                `      ["${model.$name()}"]: uModels["${model.$name()}"],`
            )
            .join("\n")}\n    },\n  },`
      )
      .join("\n")}\n};\n\n`;

    content += `export const uDraft = {\n  attributes: ${attrToStr(
      this.$seed().$attributes(),
      "    "
    )},\n  modules: uModules,\n  features: uFeatures,\n  models: uModels,\n};\n\n`;

    output.push({
      key: KEYS.draft,
      content,
    });

    return output;
  }
}

export type MODULES = {
  t: "80";
};
