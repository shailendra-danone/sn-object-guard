import { IMergeConflictPlugin, MergeConflictContext, MergeConflictResult } from './IMergeConflictPlugin';
import { IUpdateSetValidatorPlugin, UpdateSetValidationContext, UpdateSetValidationResult } from './IUpdateSetValidator';
import { IAIImpactAnalysisPlugin, ImpactRiskAssessment } from './IAIImpactAnalysis';
import { ComparisonResult } from '../models/types';

export class ExtensibilityManager {
  private static instance: ExtensibilityManager;
  private mergePlugins: Map<string, IMergeConflictPlugin> = new Map();
  private updateSetPlugins: Map<string, IUpdateSetValidatorPlugin> = new Map();
  private aiPlugins: Map<string, IAIImpactAnalysisPlugin> = new Map();

  public static getInstance(): ExtensibilityManager {
    if (!ExtensibilityManager.instance) {
      ExtensibilityManager.instance = new ExtensibilityManager();
    }
    return ExtensibilityManager.instance;
  }

  public registerMergeConflictPlugin(plugin: IMergeConflictPlugin): void {
    this.mergePlugins.set(plugin.id, plugin);
  }

  public registerUpdateSetValidator(plugin: IUpdateSetValidatorPlugin): void {
    this.updateSetPlugins.set(plugin.id, plugin);
  }

  public registerAIImpactAnalysisPlugin(plugin: IAIImpactAnalysisPlugin): void {
    this.aiPlugins.set(plugin.id, plugin);
  }

  public async runMergeConflictDetection(context: MergeConflictContext): Promise<MergeConflictResult[]> {
    const results: MergeConflictResult[] = [];
    for (const plugin of this.mergePlugins.values()) {
      try {
        const res = await plugin.detectMergeConflicts(context);
        results.push(res);
      } catch (err) {
        console.error(`Plugin ${plugin.id} error:`, err);
      }
    }
    return results;
  }

  public async runUpdateSetValidation(context: UpdateSetValidationContext): Promise<UpdateSetValidationResult[]> {
    const results: UpdateSetValidationResult[] = [];
    for (const plugin of this.updateSetPlugins.values()) {
      try {
        const res = await plugin.validateUpdateSet(context);
        results.push(res);
      } catch (err) {
        console.error(`Plugin ${plugin.id} error:`, err);
      }
    }
    return results;
  }

  public async runAIImpactAnalysis(comparisonResult: ComparisonResult): Promise<ImpactRiskAssessment[]> {
    const results: ImpactRiskAssessment[] = [];
    for (const plugin of this.aiPlugins.values()) {
      try {
        const res = await plugin.analyzeChangeImpact(comparisonResult);
        results.push(res);
      } catch (err) {
        console.error(`Plugin ${plugin.id} error:`, err);
      }
    }
    return results;
  }
}
