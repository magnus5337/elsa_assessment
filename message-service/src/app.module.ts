import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { QuizRealtimeService } from './message/message.service';
import { RedisService } from './redis/redis.service';
import { ConsumerService } from './kafka/consumer.service';
import { Quiz, QuizSchema } from './message/schemas/quiz.schema';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: Quiz.name, schema: QuizSchema }]),
  ],
  providers: [QuizRealtimeService, RedisService, ConsumerService],
})
export class AppModule {}
