export const addPackgeJsonDependency = (
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
