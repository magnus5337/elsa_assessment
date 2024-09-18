import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import {
  WebSocketServer,
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConsumerService } from '../kafka/consumer.service';
import { RedisService } from '../redis/redis.service';
import { Quiz } from './schemas/quiz.schema';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
@Injectable()
export class QuizRealtimeService implements OnModuleInit, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    @InjectModel(Quiz.name) private quizModel: Model<Quiz>,
    private consumerService: ConsumerService,
    private redisService: RedisService,
  ) {}

  async onModuleInit() {
    await this.consumerService.consume(
      'quiz.notification',
      this.handleQuizNotification.bind(this),
    );
  }

  @SubscribeMessage('join')
  async handleJoin(
    client: Socket,
    payload: { userId: string; quizId: string },
  ) {
    const { userId, quizId } = payload;
    await this.redisService.set(`user:${userId}`, client.id);
    client.join(userId);
    console.log(`User ${userId} joined with socket ID ${client.id}`);
    const quiz = await this.quizModel
      .findById(new mongoose.Types.ObjectId(quizId))
      .exec();
    if (!quiz) {
      console.log(`Quiz ${quizId} not found`);
      return;
    }

    const participants = quiz.participants.map((p) => p.userId);
    for (const participantId of participants) {
      const socketId = await this.redisService.get(`user:${participantId}`);
      if (socketId) {
        this.server.to(socketId).emit('userJoined', userId);
      }
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = await this.redisService.getUserIdBySocketId(client.id);
    if (userId) {
      await this.redisService.del(`user:${userId}`);
      console.log(`User ${userId} disconnected`);

      const quizzes = await this.quizModel.find({
        'participants.userId': userId,
      });
      for (const quiz of quizzes) {
        const updatedQuiz = await this.quizModel.findByIdAndUpdate(
          new mongoose.Types.ObjectId(quiz._id),
          { $pull: { participants: { userId: userId } } },
          { new: true },
        );

        console.log(`Removed user ${userId} from quiz ${quiz._id}`);

        if (updatedQuiz) {
          const participants = quiz.participants.map((p) => p.userId);
          for (const participantId of participants) {
            console.log(`participantId: ${participantId}`);
            const socketId = await this.redisService.get(
              `user:${participantId}`,
            );
            if (socketId) {
              this.server.to(socketId).emit('userLeft', userId);
            }
          }
        }
      }
    }
  }

  async handleQuizNotification(message: any) {
    const { userId, quizId, score } = message;
    const quiz = await this.quizModel
      .findById(new mongoose.Types.ObjectId(quizId))
      .exec();
    if (!quiz) return;
    console.log(`quiz: ${quiz}`);

    const participants = quiz.participants.map((p) => p.userId);
    for (const participantId of participants) {
      console.log(`participantId: ${participantId}`);
      const socketId = await this.redisService.get(`user:${participantId}`);
      if (socketId) {
        console.log(`Sending quizUpdate to ${socketId}`);
        this.server.to(socketId).emit('quizUpdate', { userId, score });
      }
    }
  }
}
