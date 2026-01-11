import {
  Personality,
  Question,
  ScoreBreakdown,
} from '../../common/interfaces/quiz.interface';

/**
 * Response DTO for listing all personalities
 */
export class PersonalitiesResponseDto {
  personalities: Personality[];
}

/**
 * Response DTO for listing all quiz questions
 */
export class QuestionsResponseDto {
  questions: Question[];
}

/**
 * Response DTO for quiz submission
 */
export class SubmitQuizResponseDto {
  token: string;
  topPersonality: string;
  scores: ScoreBreakdown;
}

/**
 * Response DTO for retrieving quiz result with enriched data
 */
export class QuizResultResponseDto {
  id: string;
  topPersonality: Personality;
  scores: ScoreBreakdown;
  createdAt: Date;
}
