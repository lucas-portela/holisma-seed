import { Feature } from "../entities/feature";
import { Model } from "../entities/model";
import { Module } from "../entities/module";

export type RendererSelectedFiles = Record<string, string>;
export type RendererSelection = {
  modules?: Module[];
  features?: Feature[];
  models?: Model[];
  files?: RendererSelectedFiles; // <Name, Path>
};

export type RendererFileInput = Record<string, string>; // <Name, Content>
export type RendererOutput = Record<string, string>; // <Name, Content>
