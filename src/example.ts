import DartApiClientRenderer from "./builtin/dart-api-client-renderer";
import DartClassRenderer from "./builtin/dart-class-renderer";
import TSApiClientRenderer from "./builtin/ts-api-client-renderer";
import TSClassRenderer from "./builtin/ts-class-renderer";
import TSClassValidatorRenderer from "./builtin/ts-class-validator-renderer";
import TSMongooseSchemaRenderer from "./builtin/ts-mongoose-schema-renderer";
import { UDraft } from "./entities/draft";
import { $attr } from "./shortcuts/queries";

const project = UDraft.load("example-draft.yaml");

if (project) {
  eval(`console.log(project._attributes)`);
  project
    .begin("projects/server/")
    .pipeline([
      new TSClassRenderer(),
      new TSMongooseSchemaRenderer(),
      new TSClassValidatorRenderer(),
      new TSApiClientRenderer(),
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
