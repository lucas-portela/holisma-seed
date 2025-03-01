import * as Case from "case";
import * as path from "path";
import { UFeature } from "../entities/feature";
import { UModel } from "../entities/model";
import { UModule } from "../entities/module";
import { URenderer } from "../entities/renderer";
import { addPubspecDependency } from "../helpers/package";
import { $attr } from "../shortcuts/queries";
import { RenderContent, RenderPath, RenderSelection } from "../types/renderer";
import { closeCursor, writeToCursor } from "../utils/rendering";
import DartClassRenderer from "./dart-class-renderer";
import { attrBuilder } from "../helpers/builders";
import { _http } from "../shortcuts/attributes";

const KEYS = {
  pubspec: "pubspec",
  baseApiClient: "ApiClient",
};

const DEFAULT_API_CLIENT_CODE = `
import 'package:dio/dio.dart';

class ApiClient {
  final Dio dio;

  ApiClient({required this.dio});

  Future<dynamic> request(
    String path, {
    required String method,
    String? contentType,
    Map<String, dynamic>? queryParameters,
    dynamic data,
  }) async {
    try {
      final response = await dio.request(
        path,
        options: Options(
          method: method,
          contentType: contentType,
        ),
        queryParameters: queryParameters,
        data: data,
      );
      return response.data;
    } on DioException catch (e) {
      throw ApiException(
        code: e.response?.statusCode,
        message: e.message ?? 'Unknown error',
      );
    }
  }
}

class ApiResponse<T> {
  final T? data;
  final String? error;
  final int? statusCode;

  ApiResponse.success(this.data)
    : statusCode = 200, error = null;

  ApiResponse.error({this.statusCode, String? message})
    : data = null, error = message ?? 'Unknown error';

  bool get isSuccess => error == null;
}

class ApiException implements Exception {
  final int? code;
  final String message;

  ApiException({this.code, required this.message});

  @override
  String toString() => message;
}
`.trim();

export default class DartApiClientRenderer extends URenderer {
  private _serviceDir = "lib/apis";
  private _baseClientPath = "lib/core/api_client.dart";
  private _where?: (module: UModule, feature: UFeature) => boolean;

  constructor(options?: {
    serviceDir?: string;
    baseClientPath?: string;
    where?: (module: UModule, feature: UFeature) => boolean;
  }) {
    super();
    if (options?.serviceDir) this._serviceDir = options.serviceDir;
    if (options?.baseClientPath) this._baseClientPath = options.baseClientPath;
    this._where = options?.where;
  }

  $moduleServiceName(module: UModule) {
    return `${Case.pascal(module.$name())}Api`;
  }

  $fileName(module: UModule, extension = true) {
    return `${Case.snake(module.$name())}_api${extension ? ".dart" : ""}`;
  }

  private extractPathParams(route: string): string[] {
    const regex = /{([^}]+)}/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(route)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  }

  private resolveFeatureRoute(module: UModule, feature: UFeature): string {
    const moduleConfig = $attr(module, _http());
    const featureConfig = $attr(feature, _http());
    return (
      (moduleConfig?.url || "") +
      "/" +
      (featureConfig?.url || "")
    ).replace(/\/{2,}/, "/");
  }

  private getHttpMethod(feature: UFeature): string {
    return ($attr(feature, _http())?.method || "get").toUpperCase();
  }

  async select(): Promise<RenderSelection> {
    const modules: UModule[] = [];
    const features: UFeature[] = [];
    this.$features(
      (m, f) => !!$attr(f, _http()) && (this._where ? this._where(m, f) : true)
    ).forEach(({ module, feature }) => {
      if (!modules.find((m) => m.$name() == module.$name()))
        modules.push(module);
      if (!features.find((f) => f.$name() == feature.$name()))
        features.push(feature);
    });

    const paths: RenderPath[] = [
      { key: KEYS.pubspec, path: "pubspec.yaml" },
      {
        key: KEYS.baseApiClient,
        path: this._baseClientPath,
        meta: { isBase: true },
      },
    ];

    modules.forEach((module) => {
      if (module.$features().length > 0) {
        paths.push({
          key: this.$moduleServiceName(module),
          meta: { module: module.$name() },
          path: path.join(this._serviceDir, this.$fileName(module)),
        });
      }
    });

    return {
      paths,
      modules,
      features,
    };
  }

  async render(): Promise<RenderContent[]> {
    const output: RenderContent[] = [
      {
        key: KEYS.pubspec,
        content: addPubspecDependency(
          this.$content(KEYS.pubspec)?.content || "",
          [{ name: "dio", version: "^5.4.0" }]
        ),
      },
    ];

    // Generate base API client if missing
    const baseApiClientPath = this.$path(KEYS.baseApiClient);
    const baseApiClient = this.$content(KEYS.baseApiClient);
    if (!baseApiClient?.content) {
      output.push({
        key: KEYS.baseApiClient,
        content: DEFAULT_API_CLIENT_CODE,
        meta: { isBase: true },
      });
    }

    // Generate module APIs
    const modules = this.$selection().modules || [];
    for (const module of modules) {
      const features = module.$features(this.$selection().features);

      if (features.length === 0) continue;

      const serviceName = this.$moduleServiceName(module);
      const modulePath = this.$path(serviceName);
      const dartClassRenderer = this.$seed().$requireRenderer(
        this,
        DartClassRenderer
      );

      if (!modulePath) continue;

      let imports = `import "${this.$resolveRelativePath(
        modulePath.path,
        baseApiClientPath?.path + ""
      )}";`;
      let importedModels: string[] = [];
      let methods: string[] = [];

      const importModel = (model: UModel) => {
        const modelKey = dartClassRenderer.$key(model);
        const modelPath = dartClassRenderer.$path(modelKey)?.path;
        if (importedModels.includes(modelKey)) return;
        imports += `\nimport "${this.$resolveRelativePath(
          modulePath.path,
          modelPath + ""
        )}";`;
      };

      features.forEach((feature) => {
        const methodName = Case.camel(feature.$name());
        const inputModel = feature.$input();
        const outputModel = feature.$output();
        const httpConfig = $attr(feature, _http());
        const contentType = httpConfig?.contentType;
        const params = httpConfig?.params || {};
        const method = this.getHttpMethod(feature);
        const route = this.resolveFeatureRoute(module, feature);
        const pathParams = this.extractPathParams(route);

        // Process route with path parameters
        let processedRoute = route.replace(/{([^}]+)}/g, (match, param) => {
          const fieldName = params[param];
          return inputModel && fieldName
            ? `\${${Case.camel(inputModel.$name())}.${fieldName}}`
            : match;
        });

        // Build query parameters
        const queryParamEntries = (inputModel?.$fields() || [])
          .filter(
            (field) => !Object.values(params).some((n) => n == field.$name())
          )
          .map(
            (field) =>
              `'${dartClassRenderer.$fieldName(field)}': ${Case.camel(
                inputModel?.$name() + ""
              )}.${dartClassRenderer.$fieldName(field)}`
          );
        const queryParamsCode =
          queryParamEntries.length > 0
            ? `queryParameters: {${queryParamEntries.join(", ")}}`
            : "";

        // Build data based on content type
        // And handle input model
        let inputType = "void";
        let dataCode = "";
        if (inputModel) {
          const inputClassName = dartClassRenderer.$className(inputModel);
          importModel(inputModel);
          inputType = inputClassName;

          const inputVar = Case.camel(inputModel.$name());
          if (contentType === "multipart/form-data") {
            dataCode = `data: FormData.fromMap(${inputVar}.toJson()),`;
            if (!imports.includes('import "package:dio/dio.dart";')) {
              imports = `import "package:dio/dio.dart";\n${imports}`;
            }
          } else {
            dataCode = `data: ${inputVar}.toJson(),`;
          }
        }

        // Handle output model
        let outputType = "void";
        if (outputModel) {
          const outputClassName = dartClassRenderer.$className(outputModel);
          importModel(outputModel);
          outputType = outputClassName;
        }

        // Build method parameters
        const methodParams = inputModel
          ? `${inputType} ${Case.camel(inputModel.$name())}`
          : "";

        const sendQuery =
          httpConfig?.noBody !== undefined
            ? httpConfig.noBody
            : ["GET", "SEARCH", "DELETE"].includes(method);

        // Build method implementation
        methods.push(`
  Future<ApiResponse<${outputType}>> ${methodName}(${methodParams}) async {
    try {
      ${outputModel ? "final response = " : ""}await client.request(
        '${processedRoute}',
        method: '${method}',${
          contentType ? `\n        contentType: '${contentType}',` : ""
        }${
          sendQuery && queryParamsCode ? `\n        ${queryParamsCode},` : ""
        }${!sendQuery ? `\n        ${dataCode}` : ""}
      );
      return ApiResponse.success(${
        outputModel
          ? `${dartClassRenderer.$className(outputModel)}.fromJson(response)`
          : "null"
      });
    } on ApiException catch (e) {
      return ApiResponse.error(
        statusCode: e.code,
        message: e.message,
      );
    }
  }`);
      });

      const content = `
${imports}

class ${serviceName} {
  final ApiClient client;

  ${serviceName}({
    required this.client,
  });
${methods.join("\n")}
}
      `.trim();

      output.push({
        key: serviceName,
        content,
        meta: modulePath.meta,
      });
    }

    return output;
  }
}
