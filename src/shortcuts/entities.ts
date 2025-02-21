import { Attribute } from "../entities/attribute";
import { Field } from "../entities/field";
import { Feature } from "../entities/feature";
import { Model } from "../entities/model";
import { Seed } from "../entities/seed";
import { Module } from "../entities/module";

export const attr = <Type>(name: string, value?: Type) =>
  new Attribute<Type>(name, value);

export const field = (name: string, type?: string) => new Field(name, type);

export const model = (name: string) => new Model(name);

export const feature = (name: string) => new Feature(name);

export const mod = (name: string) => new Module(name);

export const seed = (name: string) => new Seed(name);
