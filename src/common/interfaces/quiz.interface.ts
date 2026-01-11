/**
 * Personality Type
 * 
 * Represents a personality trait in the quiz system.
 * Each personality has a unique identifier, name, and description
 * that will be displayed to users in their results.
 */
export interface Personality {
  id: string;
  name: string;
  description: string;
  traits: string[];
}

/**
 * Scoring Map
 * 
 * Maps personality IDs to their point values for a specific answer option.
 * Example: { "architect": 3, "leader": 1 }
 */
export interface ScoringMap {
  [personalityId: string]: number;
}

/**
 * Answer Option
 * 
 * Represents a single answer choice for a question.
 * Each option has text displayed to the user and a scoring map
 * that determines how many points each personality receives.
 */
export interface AnswerOption {
  id: string;
  text: string;
  scores: ScoringMap;
}

/**
 * Question
 * 
 * Represents a quiz question with multiple answer options.
 * Weight determines the importance of the question in final scoring.
 * Higher weight means the question has more impact on the result.
 */
export interface Question {
  id: string;
  text: string;
  weight: number;
  options: AnswerOption[];
  order: number;
}

/**
 * User Answer
 * 
 * Represents a user's response to a single question.
 */
export interface UserAnswer {
  questionId: string;
  optionId: string;
}

/**
 * Personality Score Breakdown
 * 
 * Contains the calculated scores for all personalities.
 * Key is personality ID, value is the calculated score.
 */
export interface ScoreBreakdown {
  [personalityId: string]: number;
}

/**
 * Quiz Result
 * 
 * Complete result of a user's quiz submission.
 * Includes the top personality, detailed scores, user ID, and timestamp.
 */
export interface QuizResult {
  id: string;
  userId: string;
  topPersonality: string;
  scores: ScoreBreakdown;
  answers: UserAnswer[];
  createdAt: Date;
}

/**
 * Quiz Result Response
 * 
 * Enriched result that includes full personality details
 * for better client-side display.
 */
export interface QuizResultResponse {
  id: string;
  topPersonality: Personality;
  scores: ScoreBreakdown;
  answers: UserAnswer[];
  createdAt: Date;
}
