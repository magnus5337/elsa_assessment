import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';

@Controller('quizzes')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post()
  async createQuiz(@Body() createQuizDto: CreateQuizDto) {
    return this.quizService.createQuiz(createQuizDto);
  }

  @Get()
  async getQuizzes() {
    return this.quizService.getQuizzes();
  }

  @Get(':id')
  async getQuizById(@Param('id') quizId: string) {
    return this.quizService.getQuizById(quizId);
  }

  @Post(':id/join')
  async joinQuiz(@Param('id') quizId: string) {
    return this.quizService.joinQuiz(quizId);
  }

  @Post(':id/submit')
  async submitQuiz(
    @Param('id') quizId: string,
    @Body() submitQuizDto: SubmitQuizDto,
  ) {
    return this.quizService.submitQuiz({ ...submitQuizDto, quizId });
  }
}
