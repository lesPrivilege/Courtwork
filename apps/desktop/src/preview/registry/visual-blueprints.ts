export const IMPLEMENTED_VISUAL_BLUEPRINT_IDS = Object.freeze([
  'courtwork.artifact-table.v1',
] as const);

export function isImplementedVisualBlueprint(value: string): boolean {
  return (IMPLEMENTED_VISUAL_BLUEPRINT_IDS as readonly string[]).includes(value);
}
