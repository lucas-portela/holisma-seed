import { ModelRenderer } from "./builtin/model-renderer";
import {
  computedValue,
  defaultValue,
  size,
  max,
  min,
  notEmpty,
  required,
  unique,
  matches,
  index,
  trim,
  lowercase,
  httpPath,
  httpMethod,
  api,
} from "./shortcuts/attributes";
import { field, feature, model, mod, seed } from "./shortcuts/entities";
import { nestedArray, nested, str, bool } from "./shortcuts/fields";

const createdAt = str("createdAt").attributes([
  required(),
  defaultValue(() => new Date()),
]);
const updatedAt = str("updatedAt").attributes([
  computedValue(() => new Date()),
]);
const timestamp = model("timestamp").fields([createdAt, updatedAt]);
const isOnline = bool("is-online").attributes([defaultValue(() => false)]);

const account = model("user")
  .extends(timestamp)
  .fields([
    str("username", [
      required(),
      notEmpty(),
      min(3),
      max(20),
      unique(),
      index(),
      trim(),
      lowercase(),
    ]),
    str("password", [required(), notEmpty(), min(8), trim()]),
  ]);

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

const driver = model("driver")
  .extends(account)
  .fields([nested("vehicle", vehicle)]);

const passenger = model("passenger")
  .extends(account)
  .remove([isOnline])
  .fields([nestedArray("drivers", driver)]);

const token = model("token").fields([
  str("token", [required(), notEmpty(), trim()]),
  str("refreshToken", [required(), notEmpty(), trim()]),
]);

const accountList = model("account-list").fields([
  nestedArray("accounts", account),
]);

const project = seed("project").modules([
  mod("account-module")
    .attributes([httpPath("/account"), api("rest")])
    .features([
      feature("create-account")
        .attributes([httpPath("/"), httpMethod("post")])
        .input(
          account.pick("create-account-request", [
            account.$field(field("username")),
            account.$field(field("password")),
          ])
        )
        .output(account),
      feature("login")
        .attributes([httpPath("/auth"), httpMethod("post")])
        .output(token),
      feature("list-accounts")
        .attributes([httpPath("/")])
        .output(accountList),
    ]),
  mod("public-module")
    .attributes([api("rest")])
    .features([
      feature("health-check")
        .attributes([httpPath("/health")])
        .output(model("health-check-response").fields([str("status")])),
    ]),
]);

(async () => {
  const render = await project.render(new ModelRenderer("projects/server/"));
  console.log(render);
})();
