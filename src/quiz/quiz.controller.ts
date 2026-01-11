import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { QuizService } from './quiz.service';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import {
  PersonalitiesResponseDto,
  QuestionsResponseDto,
  SubmitQuizResponseDto,
  QuizResultResponseDto,
} from './dto/response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * Quiz Controller
 * 
 * RESTful API endpoints for the personality quiz application.
 * Handles quiz data retrieval, answer submission, and result fetching.
 * 
 * Base route: /quiz
 */
@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  /**
   * Get all personality types
   * 
   * Returns the complete list of personalities that can be
   * matched in the quiz results. Useful for displaying
   * personality information to users before starting the quiz.
   * 
   * @returns Array of all personalities
   * 
   * Example response:
   * {
   *   "personalities": [
   *     {
   *       "id": "architect",
   *       "name": "The Architect",
   *       "description": "Logical, structured, plans ahead",
   *       "traits": ["Analytical", "Organized", "Strategic"]
   *     }
   *   ]
   * }
   */
  @Get('personalities')
  async getPersonalities(): Promise<PersonalitiesResponseDto> {
    const personalities = await this.quizService.getPersonalities();
    return { personalities };
  }

  /**
   * Get all quiz questions
   * 
   * Retrieves all questions with their answer options in the correct order.
   * Questions are sorted by the 'order' field to ensure consistent presentation.
   * 
   * @returns Array of questions with options
   * 
   * Example response:
   * {
   *   "questions": [
   *     {
   *       "id": "q1",
   *       "text": "When starting a new project, you usually...",
   *       "weight": 4,
   *       "order": 1,
   *       "options": [
   *         {
   *           "id": "a",
   *           "text": "Plan everything in advance",
   *           "scores": { "architect": 3, "leader": 1 }
   *         }
   *       ]
   *     }
   *   ]
   * }
   */
  @Get('questions')
  async getQuestions(): Promise<QuestionsResponseDto> {
    const questions = await this.quizService.getQuestions();
    return { questions };
  }

  /**
   * Submit quiz answers (Requires Authentication)
   * 
   * Processes authenticated user's answers, calculates personality scores using
   * a weighted algorithm, and returns the result with a unique token.
   * 
   * **IMPORTANT**: User can only submit quiz once. Subsequent attempts will fail.
   * 
   * Request headers:
   * Authorization: Bearer <JWT_TOKEN>
   * 
   * Request body:
   * {
   *   "answers": [
   *     { "questionId": "q1", "optionId": "a" },
   *     { "questionId": "q2", "optionId": "b" }
   *   ]
   * }
   * 
   * @param submitQuizDto Validated user answers
   * @param req Express request object with authenticated user
   * @returns Result token, top personality, and score breakdown
   * 
   * Example response:
   * {
   *   "token": "abc123-def456-...",
   *   "topPersonality": "architect",
   *   "scores": {
   *     "architect": 45,
   *     "leader": 32,
   *     "explorer": 28,
   *     "supporter": 25
   *   }
   * }
   */
  @Post('submit')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async submitQuiz(
    @Body() submitQuizDto: SubmitQuizDto,
    @Request() req,
  ): Promise<SubmitQuizResponseDto> {
    return await this.quizService.submitQuiz(submitQuizDto, req.user.userId);
  }

  /**
   * Get quiz result by token (Requires Authentication)
   * 
   * Retrieves a previously submitted quiz result using its unique token.
   * Returns enriched data including full personality details.
   * 
   * **IMPORTANT**: Users can only access their own quiz results.
   * 
   * Request headers:
   * Authorization: Bearer <JWT_TOKEN>
   * 
   * @param token Unique result identifier
   * @param req Express request object with authenticated user
   * @returns Complete quiz result with personality information
   * 
   * Example response:
   * {
   *   "id": "abc123-def456-...",
   *   "topPersonality": {
   *     "id": "architect",
   *     "name": "The Architect",
   *     "description": "Logical, structured, plans ahead",
   *     "traits": ["Analytical", "Organized", "Strategic"]
   *   },
   *   "scores": {
   *     "architect": 45,
   *     "leader": 32,
   *     "explorer": 28,
   *     "supporter": 25
   *   },
   *   "createdAt": "2026-01-10T12:00:00.000Z"
   * }
   */
  @Get('result/:token')
  @UseGuards(JwtAuthGuard)
  async getResult(
    @Param('token') token: string,
    @Request() req,
  ): Promise<QuizResultResponseDto> {
    return await this.quizService.getResult(token, req.user.userId);
  }

  /**
   * Get current user's quiz result (Requires Authentication)
   * 
   * Retrieves the authenticated user's quiz result if they have completed the quiz.
   * This is a convenience endpoint that doesn't require the token parameter.
   * 
   * Request headers:
   * Authorization: Bearer <JWT_TOKEN>
   * 
   * @param req Express request object with authenticated user
   * @returns Complete quiz result with personality information
   * 
   * Example response:
   * {
   *   "id": "abc123-def456-...",
   *   "topPersonality": {
   *     "id": "architect",
   *     "name": "The Architect",
   *     "description": "Logical, structured, plans ahead",
   *     "traits": ["Analytical", "Organized", "Strategic"]
   *   },
   *   "scores": {
   *     "architect": 45,
   *     "leader": 32,
   *     "explorer": 28,
   *     "supporter": 25
   *   },
   *   "createdAt": "2026-01-10T12:00:00.000Z"
   * }
   */
  @Get('my-result')
  @UseGuards(JwtAuthGuard)
  async getMyResult(@Request() req): Promise<QuizResultResponseDto> {
    return await this.quizService.getMyResult(req.user.userId);
  }
}
