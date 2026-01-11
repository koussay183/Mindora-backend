import { Module } from '@nestjs/common';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';

/**
 * Quiz Module
 * 
 * Feature module that encapsulates all quiz-related functionality.
 * Provides REST API endpoints for personality quiz operations.
 * Integrates with authentication to enforce single-attempt policy.
 */
@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [QuizController],
  providers: [QuizService],
})
export class QuizModule {}
