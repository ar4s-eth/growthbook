import uniqid from "uniqid";
import {
  ExperimentInterface,
  ExperimentInterfaceStringDates,
} from "back-end/types/experiment";
import {
  ExperimentSnapshotAnalysis,
  ExperimentSnapshotInterface,
} from "back-end/types/experiment-snapshot";
import { FeatureInterface, FeatureRule } from "back-end/types/feature";

export * from "./features";

export function getAffectedEnvsForExperiment({
  experiment,
}: {
  experiment: ExperimentInterface | ExperimentInterfaceStringDates;
}): string[] {
  // Visual changesets are not environment-scoped, so it affects all of them
  if (experiment.hasVisualChangesets) return ["__ALL__"];

  // TODO: get actual environments for linked feature flags. We are being overly conservative here
  if (experiment.linkedFeatures && experiment.linkedFeatures.length > 0) {
    return ["__ALL__"];
  }

  return [];
}

export function getSnapshotAnalysis(
  snapshot: ExperimentSnapshotInterface
): ExperimentSnapshotAnalysis | null {
  // TODO: add a "settings" argument to this function and use it to pick the right snapshot
  // For example, if `sequential: true` is passed in, look for an analysis with sequential enabled
  return snapshot.analyses?.[0] || null;
}

export function generateVariationId() {
  return uniqid("var_");
}

export function experimentHasLinkedChanges(
  exp: ExperimentInterface | ExperimentInterfaceStringDates
): boolean {
  if (exp.hasVisualChangesets) return true;
  if (exp.linkedFeatures && exp.linkedFeatures.length > 0) return true;
  return false;
}

export function includeExperimentInPayload(
  exp: ExperimentInterface | ExperimentInterfaceStringDates,
  linkedFeatures: FeatureInterface[] = []
): boolean {
  // Archived experiments are always excluded
  if (exp.archived) return false;

  if (!experimentHasLinkedChanges(exp)) return false;

  // Exclude if experiment is a draft and there are no visual changes (feature flags always ignore draft experiment rules)
  if (!exp.hasVisualChangesets && exp.status === "draft") return false;

  if (!exp.phases?.length) return false;

  // Stopped experiments are only included if they are currently releasing a winning variant
  if (exp.status === "stopped") {
    if (exp.excludeFromPayload) return false;
    if (!exp.releasedVariationId) return false;
  }

  // If there are only linked features, make sure the rules/envs are published
  if (linkedFeatures.length > 0 && !exp.hasVisualChangesets) {
    const hasFeaturesWithPublishedRules = linkedFeatures.some((feature) => {
      if (feature.archived) return false;
      const rules = getMatchingRules(
        feature,
        (r) => r.type === "experiment-ref" && r.experimentId === exp.id,
        Object.keys(feature.environmentSettings)
      );
      return rules.some((r) => {
        if (r.draft) return false;
        if (!r.environmentEnabled) return false;
        if (r.rule.enabled === false) return false;
        return true;
      });
    });

    if (!hasFeaturesWithPublishedRules) {
      return false;
    }
  }

  return true;
}

export type MatchingRule = {
  environmentId: string;
  i: number;
  draft: boolean;
  environmentEnabled: boolean;
  rule: FeatureRule;
};
export function getMatchingRules(
  feature: FeatureInterface,
  filter: (rule: FeatureRule) => boolean,
  environments: string[]
): MatchingRule[] {
  const matches: MatchingRule[] = [];

  if (feature.environmentSettings) {
    Object.entries(feature.environmentSettings).forEach(
      ([environmentId, settings]) => {
        if (!environments.includes(environmentId)) return;
        if (settings.rules) {
          settings.rules.forEach((rule, i) => {
            if (filter(rule)) {
              matches.push({
                rule,
                i,
                draft: false,
                environmentEnabled: settings.enabled,
                environmentId,
              });
            }
          });
        }
      }
    );
  }

  if (feature.draft && feature.draft.active && feature.draft.rules) {
    Object.entries(feature.draft.rules).forEach(([environmentId, rules]) => {
      rules.forEach((rule, i) => {
        if (filter(rule)) {
          matches.push({
            rule,
            i,
            draft: true,
            environmentEnabled: !!feature.environmentSettings[environmentId]
              ?.enabled,
            environmentId,
          });
        }
      });
    });
  }

  return matches;
}

export function isProjectListValidForProject(
  projects?: string[],
  project?: string
) {
  // If project list is empty, it's always valid no matter what
  if (!projects || !projects.length) return true;

  // If there is no selected project, it's always valid
  if (!project) return true;

  // Otherwise, it's valid only if the project list contains the selected project
  return projects.includes(project);
}
