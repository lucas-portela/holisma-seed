import { TSClassRenderer } from "./builtin/ts-class-renderer";
import { TSClassValidatorRenderer } from "./builtin/ts-class-validator-renderer";
import {
  _computedValue,
  _defaultValue,
  _unique,
  _index,
  _trim,
  _lowercase,
  _httpPath,
  _httpMethod,
  _api,
  _matches,
  _max,
  _min,
  _notEmpty,
  _required,
  _size,
  _minLength,
  _maxLength,
  _isArray,
  _rootModule,
} from "./shortcuts/attributes";
import {
  uField,
  uFeature,
  uModel,
  uModule,
  uDraft,
} from "./shortcuts/entities";
import { uDate, uBoolean, uString, uNested, uNumber } from "./shortcuts/fields";

const createdAt = uDate("createdAt").attributes([
  _required(),
  _defaultValue(() => new Date()),
]);
const updatedAt = uDate("updatedAt").attributes([
  _computedValue(() => new Date()),
  _required(false),
]);
const timestamp = uModel("timestamp").fields([createdAt, updatedAt]);
const isOnline = uBoolean("is-online").attributes([_defaultValue(() => false)]);

const vehicle = uModel("vehicle")
  .extends(timestamp)
  .fields([
    uString("model", [
      _required(),
      _notEmpty(),
      _trim(),
      _matches(/^[A-Z][a-z]+$/gi),
    ]),
    uString("plate", [
      _required(),
      _notEmpty(),
      _trim(),
      _size(8),
      _matches(/^[A-Z]{3}\-\d[A-Z]\d{2}$/),
    ]),
  ]);

const healthCheckResponse = uModel("health-check-response-dto")
  .fields([uString("status")])
  .attributes([_rootModule(uModule("public"))]);

const account = uModel("account")
  .fields([
    uNumber("age", [_min(18), _max(100)]),
    uString("username", [
      _required(),
      _notEmpty(),
      _minLength(3),
      _maxLength(20),
      _unique(),
      _index(),
      _trim(),
      _lowercase(),
    ]),
    uString("password", [_required(), _notEmpty(), _min(8), _trim()]),
    uNested("vehicle", vehicle),
    uNested("health", healthCheckResponse),
  ])
  .extends(timestamp);

const driver = uModel("driver")
  .extends(account)
  .fields([uNested("vehicle", vehicle)]);

const passenger = uModel("passenger")
  .extends(account)
  .remove([isOnline])
  .fields([uNested("drivers", driver).attributes([_isArray()])]);

const token = uModel("token-dto").fields([
  uString("token", [_required(), _notEmpty(), _trim()]),
  uString("refresh-token", [_required(false), _notEmpty(), _trim()]),
]);

const project = uDraft("project").modules([
  uModule("account")
    .attributes([_httpPath("/account"), _api("rest")])
    .features([
      uFeature("create-account")
        .attributes([_httpPath("/"), _httpMethod("post")])
        .input(
          account.pick("create-account-request-dto", [
            uField("age"),
            uField("username"),
            uField("password"),
          ])
        )
        .output(account),
      uFeature("login")
        .attributes([_httpPath("/auth"), _httpMethod("post")])
        .output(token),
      uFeature("list-accounts")
        .attributes([_httpPath("/")])
        .output(
          uModel("account-list-response-dto").fields([
            uNested("accounts", account).attributes([_isArray()]),
          ])
        ),
    ]),
  uModule("public")
    .attributes([_api("rest")])
    .features([
      uFeature("health-check")
        .attributes([_httpPath("/health")])
        .output(healthCheckResponse),
    ]),
]);

(async () => {
  project
    .goTo("projects/server/")
    .pipeline([new TSClassRenderer(), new TSClassValidatorRenderer()])
    .clear()
    .goTo("projects/client/")
    .pipeline([new TSClassRenderer()]);
})();
