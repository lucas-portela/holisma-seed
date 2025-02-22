import { Feature } from "../entities/feature";
import { Model } from "../entities/model";
import { Module } from "../entities/module";
import { Renderer } from "../entities/renderer";

export type RenderSelection = {
  modules?: Module[];
  features?: Feature[];
  models?: Model[];
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
  pipeline: (renderers: Renderer[]) => PipelineCursor;
  done: Promise<void>;
};
