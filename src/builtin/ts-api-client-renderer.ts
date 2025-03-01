import * as Case from "case";
import * as path from "path";
import { UFeature } from "../entities/feature";
import { UModel } from "../entities/model";
import { UModule } from "../entities/module";
import { URenderer } from "../entities/renderer";
import { $attr } from "../shortcuts/queries";
import { RenderContent, RenderPath, RenderSelection } from "../types/renderer";
import { _http } from "../shortcuts/attributes";
import TSClassRenderer from "./ts-class-renderer";
import { addPackageJsonDependency } from "../helpers/package";

// Default Axios-based API client code for TypeScript
const DEFAULT_API_CLIENT_CODE = `
import { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

export class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor(axiosInstance: AxiosInstance) {
    this.axiosInstance = axiosInstance;
  }

  async request(
    path: string,
    options: {
      method: string,
      contentType?: string,
      queryParameters?: any,
      data?: any,
    }
  ): Promise<any> {
    try {
      const config: AxiosRequestConfig = {
        url: path,
        method: options.method.toLowerCase() as any,
        headers: options.contentType ? { 'Content-Type': options.contentType } : undefined,
        params: options.queryParameters,
        data: options.data,
      };
      const response = await this.axiosInstance.request(config);
      return response.data;
    } catch (error: any) {
      if (error && error.response) {
        throw new ApiException(error.response.status, error.message || 'Unknown error');
      }
      throw error;
    }
  }
}

export class ApiResponse<T> {
  data?: T;
  error?: string;
  statusCode?: number;

  private constructor(data?: T, error?: string, statusCode?: number) {
    this.data = data;
    this.error = error;
    this.statusCode = statusCode;
  }

  static success<T>(data: T): ApiResponse<T> {
    return new ApiResponse<T>(data, undefined, 200);
  }

  static error<T>(statusCode?: number, message?: string): ApiResponse<T> {
    return new ApiResponse<T>(undefined, message || 'Unknown error', statusCode);
  }

  get isSuccess(): boolean {
    return this.error === undefined;
  }
}

export class ApiException extends Error {
  code?: number;
  constructor(code: number | undefined, message: string) {
    super(message);
    this.code = code;
    Object.setPrototypeOf(this, ApiException.prototype);
  }
}
`.trim();

const KEYS = {
  packageJson: "packageJson",
  baseApiClient: "ApiClient",
};

export default class TSApiCLientRenderer extends URenderer {
  private _serviceDir: string = "src/apis";
  private _baseClientPath: string = "src/core/api-client.ts";
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
    return `${Case.kebab(module.$name())}-api${extension ? ".ts" : ""}`;
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
      { key: KEYS.packageJson, path: "package.json" },
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
        key: KEYS.packageJson,
        content: addPackageJsonDependency(
          this.$content(KEYS.packageJson)?.content || "",
          [{ name: "axios", version: "^1.4.0" }]
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
      const tsClassRenderer = this.$seed().$requireRenderer(
        this,
        TSClassRenderer
      );

      if (!modulePath) continue;

      let imports = `import { ApiClient, ApiResponse, ApiException } from "${this.$resolveRelativePath(
        modulePath.path,
        baseApiClientPath?.path + ""
      ).replace(/\.ts$/, "")}";`;
      let importedModels: string[] = [];
      let methods: string[] = [];

      const importModel = (model: UModel) => {
        const modelKey = tsClassRenderer.$key(model);
        const modelPath = tsClassRenderer.$path(modelKey)?.path;
        if (importedModels.includes(modelKey)) return;
        imports += `\nimport { ${tsClassRenderer.$className(
          model
        )} } from "${this.$resolveRelativePath(
          modulePath.path,
          modelPath + ""
        ).replace(/\.ts$/, "")}";`;
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
              `'${tsClassRenderer.$fieldName(field)}': ${Case.camel(
                inputModel?.$name() + ""
              )}.${tsClassRenderer.$fieldName(field)}`
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
          const inputClassName = tsClassRenderer.$className(inputModel);
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
          const outputClassName = tsClassRenderer.$className(outputModel);
          importModel(outputModel);
          outputType = outputClassName;
        }

        // Build method parameters
        const methodParams = inputModel
          ? `${Case.camel(inputModel.$name())}: ${inputType} `
          : "";

        const sendQuery =
          httpConfig?.noBody !== undefined
            ? httpConfig.noBody
            : ["GET", "SEARCH", "DELETE"].includes(method);

        // Build method implementation
        methods.push(`
  async ${methodName}(${methodParams}): Promise<ApiResponse<${outputType}>> {
    try {
      ${outputModel ? "const response = " : ""}await this._client.request(
        \`${processedRoute}\`,{
        method: '${method}',${
          contentType ? `\n        contentType: '${contentType}',` : ""
        }${
          sendQuery && queryParamsCode ? `\n        ${queryParamsCode},` : ""
        }${!sendQuery ? `\n        ${dataCode}` : ""}
      });
      return ApiResponse.success(${
        outputModel
          ? `${tsClassRenderer.$className(outputModel)}.fromJson(response)`
          : "null"
      });
    } catch (e) {
      if(e instanceof ApiException) 
        return ApiResponse.error(e.code, e.message);
      else throw e;
    }
  }`);
      });

      const content = `
${imports}

export default class ${serviceName} {
  constructor(
    private _client: ApiClient,
  ){}
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
