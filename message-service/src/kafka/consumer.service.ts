import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, Kafka } from 'kafkajs';

@Injectable()
export class ConsumerService implements OnModuleInit {
  private readonly kafka: Kafka;
  private readonly consumer: Consumer;

  constructor(private configService: ConfigService) {
    this.kafka = new Kafka({
      clientId: 'quiz-app',
      brokers: this.configService.get<string>('KAFKA_BROKERS').split(','),
    });

    this.consumer = this.kafka.consumer({ groupId: 'quiz-group' });
  }

  async onModuleInit() {
    await this.consumer.connect();
  }

  async consume(topic: string, onMessage: (message: any) => Promise<void>) {
    await this.consumer.subscribe({ topic, fromBeginning: true });
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const value = message.value.toString();
        await onMessage(JSON.parse(value));
      },
    });
  }
}
