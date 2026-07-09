import type { ScenarioDefinition } from './scenario.js';

export interface TriggerContext {
  fileType?: string;
  userAction?: string;
  classifierTags?: string[];
}

export interface ScenarioRegistry {
  list(): ScenarioDefinition[];
  findByTrigger(context: TriggerContext): ScenarioDefinition[];
}

/** 跨维度 OR：MVP 阶段注册表是推荐器不是准入门禁，命中任一维度即算匹配；不做排序/优先级。 */
function matches(scenario: ScenarioDefinition, context: TriggerContext): boolean {
  const { trigger } = scenario;
  const fileTypeMatches =
    context.fileType !== undefined && trigger.fileTypes.includes(context.fileType);
  const userActionMatches =
    context.userAction !== undefined && trigger.userActions.includes(context.userAction);
  const classifierTagMatches =
    context.classifierTags !== undefined &&
    context.classifierTags.some((tag) => trigger.classifierTags.includes(tag));
  return fileTypeMatches || userActionMatches || classifierTagMatches;
}

export function createScenarioRegistry(scenarios: ScenarioDefinition[]): ScenarioRegistry {
  const snapshot = [...scenarios];
  return {
    list(): ScenarioDefinition[] {
      return [...snapshot];
    },
    findByTrigger(context: TriggerContext): ScenarioDefinition[] {
      return snapshot.filter((scenario) => matches(scenario, context));
    },
  };
}
