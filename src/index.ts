import { TSClassRenderer } from "./builtin/ts-class-renderer";
import { TSClassValidatorRenderer } from "./builtin/ts-class-validator-renderer";
import { TSMongooseSchemaRenderer } from "./builtin/ts-mongoose-schema-renderer";
import { UDraft } from "./entities/draft";

const project = UDraft.load("project.yaml");

if (project)
  project
    .begin("projects/server/")
    .pipeline([
      new TSClassRenderer(),
      new TSMongooseSchemaRenderer(),
      new TSClassValidatorRenderer(),
    ])
    .clear()
    .goTo("projects/client/")
    .pipeline([new TSClassRenderer()])
    .exec();
