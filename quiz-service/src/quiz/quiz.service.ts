import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Quiz, QuizDocument } from './schemas/quiz.schema';
import { RedisService } from '../redis/redis.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class QuizService {
  constructor(
    @InjectModel(Quiz.name) private quizModel: Model<QuizDocument>,
    private redisService: RedisService,
    @Inject('QUIZ_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  private simplifyQuizForCache(quiz: any): Partial<Quiz> {
    return {
      _id: quiz._id,
      title: quiz.title,
      questions: quiz.questions.map((question) => ({
        _id: question._id,
        question: question.question,
        questionId: question.questionId,
        answers: question.answers,
        media: question.media,
      })),
    };
  }
  async createQuiz(createQuizDto: CreateQuizDto): Promise<Quiz> {
    const createdQuiz = new this.quizModel(createQuizDto);
    const savedQuiz = await createdQuiz.save();
    const simplifiedQuiz = this.simplifyQuizForCache(savedQuiz.toObject());
    await this.redisService.set(
      `quiz:${savedQuiz._id}`,
      JSON.stringify(simplifiedQuiz),
    );
    return savedQuiz;
  }

  async getQuizzes(): Promise<Partial<Quiz>[]> {
    const quizzes = await this.quizModel.find().lean().exec();
    console.log('quizzes', quizzes);
    const simplifiedQuizzes = quizzes.map(this.simplifyQuizForCache);
    return simplifiedQuizzes;
  }

  async getQuizById(quizId: string): Promise<Partial<Quiz>> {
    const cachedQuiz = await this.redisService.get(`quiz:${quizId}`);
    if (cachedQuiz) {
      return JSON.parse(cachedQuiz);
    }
    const quiz = await this.quizModel
      .findById(new mongoose.Types.ObjectId(quizId))
      .lean()
      .exec();
    if (!quiz) {
      throw new Error('Quiz not found');
    }
    const simplifiedQuiz = this.simplifyQuizForCache(quiz);
    await this.redisService.set(
      `quiz:${quizId}`,
      JSON.stringify(simplifiedQuiz),
    );
    return simplifiedQuiz;
  }

  async joinQuiz(
    quizId: string,
  ): Promise<{ userId: string; quiz: Partial<Quiz> }> {
    const userId = uuidv4();
    console.log('quizId', quizId);
    const updatedQuiz = await this.quizModel.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(quizId) },
      { $push: { participants: { userId, score: 0 } } },
      { new: true, lean: true },
    );

    if (!updatedQuiz) {
      throw new NotFoundException('Quiz not found');
    }

    const simplifiedQuiz = this.simplifyQuizForCache(updatedQuiz);
    await this.redisService.set(
      `quiz:${quizId}`,
      JSON.stringify(simplifiedQuiz),
    );

    await this.kafkaClient.emit('quiz.joined', { quizId, userId });

    return { userId, quiz: updatedQuiz };
  }

  async submitQuiz(submitQuizDto: SubmitQuizDto): Promise<{
    message: string;
    submissionDetails: {
      userId: string;
      quizId: string;
      questionId: string;
      answerId: string;
    };
  }> {
    // const quiz = await this.quizModel.findById(submitQuizDto.quizId);
    // if (!quiz) {
    //   throw new Error('Quiz not found');
    // }

    // if (!quiz.participants.includes(userId)) {
    //   throw new Error('User is not a participant of this quiz');
    // }

    // // Validate answers
    // const isValid = submitQuizDto.answers.every((answer) =>
    //   quiz.questions.some((question) =>
    //     question.answers.some((a) => a.id === answer.answerId),
    //   ),
    // );

    // if (!isValid) {
    //   throw new Error('Invalid answer submitted');
    // }

    await this.kafkaClient.emit('quiz.submitted', {
      userId: submitQuizDto.userId,
      quizId: submitQuizDto.quizId,
      questionId: submitQuizDto.questionId,
      answerId: submitQuizDto.answerId,
    });

    return {
      message: 'Quiz submission received',
      submissionDetails: {
        userId: submitQuizDto.userId,
        quizId: submitQuizDto.quizId,
        questionId: submitQuizDto.questionId,
        answerId: submitQuizDto.answerId,
      },
    };
  }
}
