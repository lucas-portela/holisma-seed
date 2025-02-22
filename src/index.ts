import { ModelRenderer } from "./builtin/model-renderer";
import { ModelValidatorRenderer } from "./builtin/model-validator-renderer";
import {
  computedValue,
  defaultValue,
  unique,
  index,
  trim,
  lowercase,
  httpPath,
  httpMethod,
  api,
  matches,
  max,
  min,
  notEmpty,
  required,
  size,
  minLength,
  maxLength,
  isArray,
} from "./shortcuts/attributes";
import { field, feature, model, mod, seed } from "./shortcuts/entities";
import { date, bool, str, nested, num } from "./shortcuts/fields";

const createdAt = date("createdAt").attributes([
  required(),
  defaultValue(() => new Date()),
]);
const updatedAt = date("updatedAt").attributes([
  computedValue(() => new Date()),
  required(false),
]);
const timestamp = model("timestamp").fields([createdAt, updatedAt]);
const isOnline = bool("is-online").attributes([defaultValue(() => false)]);

const vehicle = model("vehicle")
  .extends(timestamp)
  .fields([
    str("model", [required(), notEmpty(), trim()]),
    str("plate", [
      required(),
      notEmpty(),
      trim(),
      size(8),
      matches(/^[A-Z]{3}\-\d[A-Z]\d{2}$/),
    ]),
  ]);

const healthCheckResponse = model("health-check-response-dto").fields([
  str("status"),
]);

const account = model("account")
  .fields([
    num("age", [min(18), max(100)]),
    str("username", [
      required(),
      notEmpty(),
      minLength(3),
      maxLength(20),
      unique(),
      index(),
      trim(),
      lowercase(),
    ]),
    str("password", [required(), notEmpty(), min(8), trim()]),
    nested("vehicle", vehicle),
    nested("health", healthCheckResponse),
  ])
  .extends(timestamp);

const driver = model("driver")
  .extends(account)
  .fields([nested("vehicle", vehicle)]);

const passenger = model("passenger")
  .extends(account)
  .remove([isOnline])
  .fields([nested("drivers", driver).attributes([isArray()])]);

const token = model("token-dto").fields([
  str("token", [required(), notEmpty(), trim()]),
  str("refresh-token", [required(false), notEmpty(), trim()]),
]);

const project = seed("project").modules([
  mod("account")
    .attributes([httpPath("/account"), api("rest")])
    .features([
      feature("create-account")
        .attributes([httpPath("/"), httpMethod("post")])
        .input(
          account.pick("create-account-request-dto", [
            field("age"),
            field("username"),
            field("password"),
          ])
        )
        .output(account),
      feature("login")
        .attributes([httpPath("/auth"), httpMethod("post")])
        .output(token),
      feature("list-accounts")
        .attributes([httpPath("/")])
        .output(
          model("account-list-response-dto").fields([
            nested("accounts", account).attributes([isArray()]),
          ])
        ),
    ]),
  mod("public")
    .attributes([api("rest")])
    .features([
      feature("health-check")
        .attributes([httpPath("/health")])
        .output(healthCheckResponse),
    ]),
]);

(async () => {
  project
    .goTo("projects/server/")
    .pipeline([new ModelRenderer()])
    .pipeline([new ModelValidatorRenderer()]);
})();
