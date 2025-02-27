import { TSClassRenderer } from "./builtin/ts-class-renderer";
import { TSClassValidatorRenderer } from "./builtin/ts-class-validator-renderer";
import { TSMongooseSchemaRenderer } from "./builtin/ts-mongoose-schema-renderer";
import {
  _matches,
  _notEmpty,
  _required,
  _schema,
  _unique,
} from "./shortcuts/attributes";
import { uDraft, uFeature, uModel, uModule } from "./shortcuts/entities";
import { uDate, uNested, uString } from "./shortcuts/fields";

const timesamps = uModel("timestamps").fields([
  uDate("createdAt").attributes([_required()]),
  uDate("updatedAt").attributes([_required(false)]),
]);

const project = uDraft("test-project").modules([
  uModule("account-management")
    .models([
      uModel("account")
        .attributes([_schema("accounts")])
        .fields([
          uString("name").attributes([_notEmpty()]),
          uString("email").attributes([_unique(), _matches(/.+@.+\..+/)]),
          uString("password").attributes([]),
        ])
        .extends(timesamps),
    ])
    .features([
      uFeature("signup")
        .input(
          uModel("account").pick("signup-request-dto", [
            "name",
            "email",
            "password",
          ])
        )
        .output(
          uModel("signup-response-dto").fields([
            uNested("account", uModel("account")),
            uNested(
              "token",
              uModel("token-dto").fields([
                uString("token"),
                uString("refreshToken"),
              ])
            ),
          ])
        ),
    ]),
]);

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
