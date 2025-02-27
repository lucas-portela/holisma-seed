import { UFeature } from "../entities/feature";
import { UModel } from "../entities/model";
import { UModule } from "../entities/module";
import { URenderer } from "../entities/renderer";

export type RenderSelection = {
  modules?: UModule[];
  features?: UFeature[];
  models?: UModel[];
  paths?: RenderPath[];
};

export type RenderPath = {
  key: string;
  path: string;
  meta?: Record<string, any>;
};

export type RenderContent = {
  key: string;
  content: string;
  meta?: Record<string, string>;
};

export type PipelineCursor = {
  goTo: (workingDir: string) => PipelineCursor;
  clear: () => PipelineCursor;
  pipeline: (renderers: URenderer[]) => PipelineCursor;
  exec(): Promise<void>;
};
