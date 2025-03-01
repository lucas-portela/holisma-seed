import * as yaml from "yaml";

export const addPackageJsonDependency = (
  content: string,
  dependencies: { name: string; version: string; dev?: boolean }[]
) => {
  const packageJson = JSON.parse(content || "{}");
  packageJson.dependencies = packageJson.dependencies || {};
  packageJson.devDependencies = packageJson.devDependencies || {};
  for (const dependency of dependencies) {
    if (
      (dependency.dev && packageJson.devDependencies[dependency.name]) ||
      (!dependency.dev && packageJson.dependencies[dependency.name])
    )
      continue;
    dependency.dev
      ? (packageJson.devDependencies[dependency.name] = dependency.version)
      : (packageJson.dependencies[dependency.name] = dependency.version);
  }
  return JSON.stringify(packageJson, null, 2);
};

export const addPubspecDependency = (
  content: string,
  dependencies: { name: string; version: string; dev?: boolean }[]
) => {
  const pubspec =
    (yaml.parse(content) as {
      dependencies: Record<string, string>;
      dev_dependencies: Record<string, string>;
    }) || {};

  pubspec.dependencies = pubspec.dependencies || {};
  pubspec.dev_dependencies = pubspec.dev_dependencies || {};

  for (const dependency of dependencies) {
    if (
      (dependency.dev && pubspec.dev_dependencies[dependency.name]) ||
      (!dependency.dev && pubspec.dependencies[dependency.name])
    ) {
      continue;
    }

    if (dependency.dev) {
      pubspec.dev_dependencies[dependency.name] = dependency.version;
    } else {
      pubspec.dependencies[dependency.name] = dependency.version;
    }
  }

  return yaml.stringify(pubspec, { indent: 2 });
};
