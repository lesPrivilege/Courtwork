// PACKAGE-ABI（2026-07-13）：包 manifest + 准入 + 运行时 registries。
// v1 YAML 单文件装载面（scenario/loader/query）已随 legal 迁包退役：
// 场景声明随包 manifest 走 admitPackages → buildPackageRegistries。
export * from './package-manifest.js';
export * from './admission.js';
export * from './package-registries.js';
