import { ComparisonResult } from '../models/types';

export interface ImpactRiskAssessment {
  riskScore: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: string;
  affectedComponents: string[];
  recommendation: string;
}

export interface IAIImpactAnalysisPlugin {
  id: string;
  name: string;
  analyzeChangeImpact(result: ComparisonResult): Promise<ImpactRiskAssessment>;
}
