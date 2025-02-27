import { TSClassRenderer } from "./builtin/ts-class-renderer";
import { TSClassValidatorRenderer } from "./builtin/ts-class-validator-renderer";
import { TSMongooseSchemaRenderer } from "./builtin/ts-mongoose-schema-renderer";
import {
  _array,
  _enum,
  _index,
  _matches,
  _notEmpty,
  _required,
  _schema,
  _unique,
} from "./shortcuts/attributes";
import { uDraft, uFeature, uModel, uModule } from "./shortcuts/entities";
import { uDate, uEnum, uNested, uReference, uString } from "./shortcuts/fields";

const timesamps = uModel("timestamps").fields([
  uDate("createdAt").attributes([_required()]),
  uDate("updatedAt").attributes([_required(false)]),
]);

enum AccountType {
  ADMIN,
  USER,
  GUEST,
}

const project = uDraft("test-project").modules([
  uModule("account")
    .models([
      uModel("account")
        .attributes([_schema("accounts")])
        .fields([
          uString("name").attributes([_notEmpty()]),
          uString("email").attributes([_unique(), _matches(/.+@.+\..+/)]),
          uString("password").attributes([]),
          uEnum("type", "account-type", AccountType).attributes([
            _required(),
            _array(),
          ]),
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
              "tokens",
              uModel("token-dto").fields([
                uString("accessToken"),
                uString("refreshToken"),
              ])
            ),
          ])
        ),
    ]),
  uModule("vehicle")
    .models([
      uModel("location")
        .attributes([_schema("locations")])
        .fields([
          uReference("vehicle", uModel("vehicle")).attributes([
            _required(),
            _index(),
          ]),
          uString("latitude").attributes([_notEmpty()]),
          uString("longitude").attributes([_notEmpty()]),
          uEnum("type", "account-type"),
        ])
        .extends(timesamps),
      uModel("vehicle")
        .attributes([_schema("vehicles")])
        .fields([
          uReference("owner", uModel("account")).attributes([
            _required(),
            _index(),
          ]),
          uString("make").attributes([_notEmpty()]),
          uString("model").attributes([_notEmpty()]),
          uString("vin").attributes([_unique()]),
        ])
        .extends(timesamps),
    ])
    .features([
      uFeature("registerVehicle")
        .input(
          uModel("vehicle").pick("register-vehicle-dto", [
            "make",
            "model",
            "vin",
          ])
        )
        .output(
          uModel("register-vehicle-response-dto").fields([
            uNested("vehicle", uModel("vehicle")),
          ])
        ),
    ]),
  uModule("tracking").features([
    uFeature("trackLocation")
      .input(
        uModel("location").pick("track-location-dto", [
          "latitude",
          "longitude",
          "timestamp",
        ])
      )
      .output(
        uModel("track-location-response-dto").fields([
          uNested("location", uModel("location")),
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
