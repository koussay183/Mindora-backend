import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { UsersService } from '../users/users.service';
import {
  Personality,
  Question,
  QuizResult,
  ScoreBreakdown,
  UserAnswer,
} from '../common/interfaces/quiz.interface';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { nanoid } from 'nanoid';

/**
 * Quiz Service
 * 
 * Core business logic for the personality quiz application.
 * Handles data retrieval from Firestore, answer validation,
 * and deterministic scoring with tie-break resolution.
 */
@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);
  private readonly COLLECTIONS = {
    PERSONALITIES: 'personalities',
    QUESTIONS: 'questions',
    RESULTS: 'results',
  };

  constructor(
    private firebaseService: FirebaseService,
    private usersService: UsersService,
  ) {}

  /**
   * Retrieve all personalities from Firestore
   * 
   * @returns Array of all personality types
   * @throws NotFoundException if no personalities exist in database
   */
  async getPersonalities(): Promise<Personality[]> {
    try {
      const db = this.firebaseService.getFirestore();
      const snapshot = await db
        .collection(this.COLLECTIONS.PERSONALITIES)
        .orderBy('id')
        .get();

      if (snapshot.empty) {
        throw new NotFoundException('No personalities found in database');
      }

      return snapshot.docs.map((doc) => doc.data() as Personality);
    } catch (error) {
      this.logger.error('Error fetching personalities', error.stack);
      throw error;
    }
  }

  /**
   * Retrieve all quiz questions with options
   * 
   * Questions are sorted by their order field to ensure
   * consistent presentation across quiz sessions.
   * 
   * @returns Array of questions with answer options
   * @throws NotFoundException if no questions exist in database
   */
  async getQuestions(): Promise<Question[]> {
    try {
      const db = this.firebaseService.getFirestore();
      const snapshot = await db
        .collection(this.COLLECTIONS.QUESTIONS)
        .orderBy('order')
        .get();

      if (snapshot.empty) {
        throw new NotFoundException('No questions found in database');
      }

      return snapshot.docs.map((doc) => doc.data() as Question);
    } catch (error) {
      this.logger.error('Error fetching questions', error.stack);
      throw error;
    }
  }

  /**
   * Submit quiz answers and calculate personality result
   * 
   * Process:
   * 1. Check if user has already completed quiz (single attempt enforcement)
   * 2. Validate all answers against database questions
   * 3. Calculate weighted scores for each personality
   * 4. Determine top personality with tie-break logic
   * 5. Store result in Firestore
   * 6. Mark user as having completed quiz
   * 
   * @param submitQuizDto User's answers to quiz questions
   * @param userId Authenticated user ID
   * @returns Result token, top personality, and score breakdown
   * @throws ForbiddenException if user has already completed quiz
   * @throws BadRequestException if answers are invalid
   */
  async submitQuiz(
    submitQuizDto: SubmitQuizDto,
    userId: string,
  ): Promise<{
    token: string;
    topPersonality: string;
    scores: ScoreBreakdown;
  }> {
    try {
      // Check if user has already completed quiz (single attempt policy)
      const hasCompleted = await this.usersService.hasCompletedQuiz(userId);
      if (hasCompleted) {
        throw new ForbiddenException(
          'You have already completed the quiz. Each user can only take the quiz once.',
        );
      }

      const { answers } = submitQuizDto;

      // Fetch all questions for validation and scoring
      const questions = await this.getQuestions();
      const questionMap = new Map(questions.map((q) => [q.id, q]));

      // Validate answers
      this.validateAnswers(answers, questionMap);

      // Calculate scores using weighted algorithm
      const scores = this.calculateScores(answers, questionMap);

      // Determine top personality with tie-break
      const topPersonality = this.resolveTopPersonality(scores, answers, questionMap);

      // Generate unique token for result retrieval
      const token = nanoid();

      // Store result in Firestore
      const result: QuizResult = {
        id: token,
        userId,
        topPersonality,
        scores,
        answers: answers.map(a => ({
          questionId: a.questionId,
          optionId: a.optionId,
        })),
        createdAt: new Date(),
      };

      await this.saveResult(result);

      // Mark user as having completed quiz
      await this.usersService.markQuizCompleted(userId, token);

      this.logger.log(`Quiz submitted successfully by user ${userId}: ${token}`);

      return {
        token,
        topPersonality,
        scores,
      };
    } catch (error) {
      this.logger.error('Error submitting quiz', error.stack);
      throw error;
    }
  }

  /**
   * Retrieve quiz result by token
   * 
   * Enriches result with full personality details for the top personality.
   * Verifies that the authenticated user owns this result.
   * 
   * @param token Unique result identifier
   * @param userId Authenticated user ID
   * @returns Complete quiz result with personality details
   * @throws NotFoundException if result doesn't exist
   * @throws ForbiddenException if user doesn't own this result
   */
  async getResult(
    token: string,
    userId: string,
  ): Promise<{
    id: string;
    topPersonality: Personality;
    scores: ScoreBreakdown;
    createdAt: Date;
  }> {
    try {
      const db = this.firebaseService.getFirestore();
      const doc = await db
        .collection(this.COLLECTIONS.RESULTS)
        .doc(token)
        .get();

      if (!doc.exists) {
        throw new NotFoundException(`Result with token ${token} not found`);
      }

      const result = doc.data() as QuizResult;

      // Verify user owns this result
      if (result.userId !== userId) {
        throw new ForbiddenException(
          'You can only access your own quiz results',
        );
      }

      // Fetch full personality details
      const personalities = await this.getPersonalities();
      const topPersonalityData = personalities.find(
        (p) => p.id === result.topPersonality,
      );

      if (!topPersonalityData) {
        throw new NotFoundException(
          `Personality ${result.topPersonality} not found`,
        );
      }

      return {
        id: result.id,
        topPersonality: topPersonalityData,
        scores: result.scores,
        createdAt: result.createdAt,
      };
    } catch (error) {
      this.logger.error(`Error fetching result: ${token}`, error.stack);
      throw error;
    }
  }

  /**
   * Get current user's quiz result
   * 
   * Retrieves the authenticated user's quiz result if they have completed the quiz.
   * 
   * @param userId Authenticated user ID
   * @returns Complete quiz result with personality details
   * @throws NotFoundException if user hasn't completed quiz yet
   */
  async getMyResult(userId: string): Promise<{
    id: string;
    topPersonality: Personality;
    scores: ScoreBreakdown;
    createdAt: Date;
  }> {
    try {
      // Get user's quiz token
      const user = await this.usersService.findById(userId);
      
      if (!user || !user.hasCompletedQuiz || !user.quizToken) {
        throw new NotFoundException(
          'You have not completed the quiz yet',
        );
      }

      // Retrieve result using the token
      return await this.getResult(user.quizToken, userId);
    } catch (error) {
      this.logger.error(`Error fetching user result: ${userId}`, error.stack);
      throw error;
    }
  }

  /**
   * Validate user answers against database questions
   * 
   * Checks:
   * - All questions exist in database
   * - Selected options are valid for each question
   * - No duplicate answers for the same question
   * 
   * @param answers User's submitted answers
   * @param questionMap Map of question ID to question data
   * @throws BadRequestException if validation fails
   */
  private validateAnswers(
    answers: UserAnswer[],
    questionMap: Map<string, Question>,
  ): void {
    const answeredQuestions = new Set<string>();

    for (const answer of answers) {
      // Check for duplicate answers
      if (answeredQuestions.has(answer.questionId)) {
        throw new BadRequestException(
          `Duplicate answer for question: ${answer.questionId}`,
        );
      }
      answeredQuestions.add(answer.questionId);

      // Validate question exists
      const question = questionMap.get(answer.questionId);
      if (!question) {
        throw new BadRequestException(
          `Invalid question ID: ${answer.questionId}`,
        );
      }

      // Validate option exists for this question
      const option = question.options.find((opt) => opt.id === answer.optionId);
      if (!option) {
        throw new BadRequestException(
          `Invalid option ID: ${answer.optionId} for question: ${answer.questionId}`,
        );
      }
    }
  }

  /**
   * Calculate weighted personality scores
   * 
   * Algorithm:
   * For each answer:
   *   For each personality in the selected option's scoring map:
   *     score[personality] += question.weight * option.scores[personality]
   * 
   * @param answers User's submitted answers
   * @param questionMap Map of question ID to question data
   * @returns Calculated scores for all personalities
   */
  private calculateScores(
    answers: UserAnswer[],
    questionMap: Map<string, Question>,
  ): ScoreBreakdown {
    const scores: ScoreBreakdown = {};

    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;
      
      const option = question.options.find((opt) => opt.id === answer.optionId);
      if (!option) continue;

      // Apply weighted scoring
      for (const [personalityId, points] of Object.entries(option.scores)) {
        if (!scores[personalityId]) {
          scores[personalityId] = 0;
        }
        scores[personalityId] += question.weight * points;
      }
    }

    return scores;
  }

  /**
   * Determine top personality with tie-break logic
   * 
   * Tie-break rules:
   * 1. Highest total score wins
   * 2. If tied, compare highest single weighted contribution
   * 3. If still tied, use alphabetical order by personality ID
   * 
   * This ensures deterministic results - same answers always produce
   * the same result with no randomness.
   * 
   * @param scores Calculated personality scores
   * @param answers User's submitted answers
   * @param questionMap Map of question ID to question data
   * @returns ID of the winning personality
   */
  private resolveTopPersonality(
    scores: ScoreBreakdown,
    answers: UserAnswer[],
    questionMap: Map<string, Question>,
  ): string {
    // Find personalities with highest score
    const maxScore = Math.max(...Object.values(scores));
    const topPersonalities = Object.keys(scores).filter(
      (id) => scores[id] === maxScore,
    );

    // No tie - return winner
    if (topPersonalities.length === 1) {
      return topPersonalities[0];
    }

    // Tie-break: Calculate highest single contribution for each personality
    const maxContributions = this.calculateMaxContributions(
      topPersonalities,
      answers,
      questionMap,
    );

    const maxContribution = Math.max(...Object.values(maxContributions));
    const winnersAfterTieBreak = topPersonalities.filter(
      (id) => maxContributions[id] === maxContribution,
    );

    // If still tied after contribution check, sort alphabetically
    winnersAfterTieBreak.sort();

    return winnersAfterTieBreak[0];
  }

  /**
   * Calculate maximum single contribution for tie-break
   * 
   * For each personality, find the highest weighted score
   * from any single question.
   * 
   * @param personalities List of tied personalities
   * @param answers User's submitted answers
   * @param questionMap Map of question ID to question data
   * @returns Map of personality ID to their max single contribution
   */
  private calculateMaxContributions(
    personalities: string[],
    answers: UserAnswer[],
    questionMap: Map<string, Question>,
  ): { [personalityId: string]: number } {
    const maxContributions: { [personalityId: string]: number } = {};

    // Initialize with 0
    for (const personalityId of personalities) {
      maxContributions[personalityId] = 0;
    }

    // Find max contribution from any single question
    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;
      
      const option = question.options.find((opt) => opt.id === answer.optionId);
      if (!option) continue;

      for (const personalityId of personalities) {
        if (option.scores[personalityId]) {
          const contribution = question.weight * option.scores[personalityId];
          maxContributions[personalityId] = Math.max(
            maxContributions[personalityId],
            contribution,
          );
        }
      }
    }

    return maxContributions;
  }

  /**
   * Save quiz result to Firestore
   * 
   * @param result Complete quiz result data
   */
  private async saveResult(result: QuizResult): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection(this.COLLECTIONS.RESULTS).doc(result.id).set({
      id: result.id,
      userId: result.userId,
      topPersonality: result.topPersonality,
      scores: result.scores,
      answers: result.answers,
      createdAt: result.createdAt.toISOString(),
    });
  }
}
