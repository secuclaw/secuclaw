export interface FeedbackRecord {
  id: string;
  sessionId: string;
  messageId: string;
  skill: string;
  query: string;
  response: string;
  rating: "positive" | "negative" | "neutral";
  feedback?: string;
  timestamp: number;
  provider: string;
  model: string;
  taskCategory: string;
}

export interface LearningPattern {
  id: string;
  pattern: string;
  category: string;
  successfulResponses: string[];
  failedResponses: string[];
  successRate: number;
  lastUpdated: number;
  suggestedImprovements: string[];
}

export interface SkillEvolution {
  skillId: string;
  version: number;
  originalPrompt: string;
  currentPrompt: string;
  improvements: Array<{
    timestamp: number;
    change: string;
    reason: string;
    feedbackScore: number;
  }>;
  performanceScore: number;
}

export interface LearningConfig {
  dataDir: string;
  minFeedbackForPattern: number;
  improvementThreshold: number;
  maxPatternsPerSkill: number;
}

export const DEFAULT_LEARNING_CONFIG: Omit<LearningConfig, "dataDir"> = {
  minFeedbackForPattern: 5,
  improvementThreshold: 0.7,
  maxPatternsPerSkill: 100,
};
