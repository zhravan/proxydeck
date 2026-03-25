import rootPackage from "../package.json" with { type: "json" };

/** Monorepo root `package.json` - single source for release version. */
export const appVersion: string = rootPackage.version;

export const appName: string = rootPackage.name;
