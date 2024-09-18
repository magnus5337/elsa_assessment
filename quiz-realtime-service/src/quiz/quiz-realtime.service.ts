import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Quiz } from './quiz.schema';
import { KafkaService } from '../kafka/kafka.service';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class QuizRealtimeService implements OnModuleInit {
  constructor(
    @InjectModel(Quiz.name) private quizModel: Model<Quiz>,
    private kafkaService: KafkaService,
    private redisService: RedisService,
  ) {}

  async onModuleInit() {
    await this.kafkaService.consumeMessages(
      'quiz.submitted',
      this.handleQuizSubmission.bind(this),
    );
  }

  async handleQuizSubmission(message: {
    userId: string;
    quizId: string;
    answerId: string;
    questionId: string;
  }) {
    const { userId, quizId, answerId, questionId } = message;

    const quiz = await this.quizModel
      .findById(new mongoose.Types.ObjectId(quizId))
      .exec();
    if (!quiz) {
      console.log(`Quiz not found: ${quizId}`);
      return;
    }
    const question = quiz.questions.find(q => q.questionId === questionId);
    const isCorrect = question && question.correctAnswerId === answerId;
    
    if (isCorrect) {
      console.log(`Correct answer for question ${questionId} in quiz ${quizId}`);
    } else {
      console.log(`Incorrect answer for question ${questionId} in quiz ${quizId}`);
    }

    if (isCorrect) {
      const updatedQuiz = await this.quizModel
        .findOneAndUpdate(
          { _id: quizId, 'participants.userId': userId },
          { $inc: { 'participants.$.score': 1 } },
          { new: true },
        )
        .exec();

      if (updatedQuiz) {
        const participant = updatedQuiz.participants.find(
          (p) => p.userId === userId,
        );
        await this.kafkaService.sendMessage('quiz.notification', {
          userId,
          quizId,
          score: participant.score,
        });
      }
    }
  }
}
