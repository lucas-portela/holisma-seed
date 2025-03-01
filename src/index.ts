export * from "./builtin/ts-class-renderer";
export * from "./builtin/ts-class-validator-renderer";
export * from "./builtin/ts-mongoose-schema-renderer";
export * from "./entities/attribute";
export * from "./entities/draft";
export * from "./entities/feature";
export * from "./entities/field";
export * from "./entities/model";
export * from "./entities/module";
export * from "./entities/renderer";
export * from "./errors/missing-attribute-error";
export * from "./errors/parsing-error";
export * from "./errors/renderer-required-error";
export * from "./errors/udraft-error";
export * from "./helpers/builders";
export * from "./helpers/package";
export * from "./shortcuts/attributes";
export * from "./shortcuts/entities";
export * from "./shortcuts/fields";
export * from "./shortcuts/queries";
export * from "./types/encoding";
export * from "./types/renderer";
export * from "./utils/rendering";
import DartApiClientRenderer from "./builtin/dart-api-client-renderer";
import DartClassRenderer from "./builtin/dart-class-renderer";
import TSClassRenderer from "./builtin/ts-class-renderer";
import TSClassValidatorRenderer from "./builtin/ts-class-validator-renderer";
import TSMongooseSchemaRenderer from "./builtin/ts-mongoose-schema-renderer";
import { UDraft } from "./entities/draft";
import { $attr } from "./shortcuts/queries";

const project = UDraft.load("demo-project.yaml");

if (project) {
  eval(`console.log(project._attributes)`);
  project
    .begin("projects/server/")
    .pipeline([
      new TSClassRenderer(),
      new TSMongooseSchemaRenderer(),
      new TSClassValidatorRenderer(),
    ])
    .clear()
    .goTo("projects/client/")
    .pipeline([
      new DartClassRenderer({
        where: (mod, model) => !$attr(model, "schema"),
      }),
      new DartApiClientRenderer(),
    ])
    .exec();
}
