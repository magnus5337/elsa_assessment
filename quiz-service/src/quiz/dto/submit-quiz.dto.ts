import { IsString } from 'class-validator';

export class SubmitQuizDto {
  @IsString()
  userId: string;

  @IsString()
  quizId: string;

  @IsString()
  questionId: string;

  @IsString()
  answerId: string;
}
