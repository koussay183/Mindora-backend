import {
  IsString,
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for a single user answer
 */
export class UserAnswerDto {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsString()
  @IsNotEmpty()
  optionId: string;
}

/**
 * DTO for submitting quiz answers
 * 
 * Validates that:
 * - Answers array is present and not empty
 * - Each answer contains valid questionId and optionId
 */
export class SubmitQuizDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one answer is required' })
  @ValidateNested({ each: true })
  @Type(() => UserAnswerDto)
  answers: UserAnswerDto[];
}
