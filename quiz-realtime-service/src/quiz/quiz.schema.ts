import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
class Answer {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  text: string;
}

@Schema()
class Question {
  @Prop({ required: true })
  questionId: string;

  @Prop({ required: true })
  question: string;

  @Prop({ type: [Answer], required: true })
  answers: Answer[];

  @Prop({ required: true })
  correctAnswerId: string;

  @Prop()
  media?: string;
}

@Schema()
class Participant {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, default: 0 })
  score: number;
}

@Schema()
export class Quiz extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ type: [Question], required: true })
  questions: Question[];

  @Prop({ type: [Participant], default: [] })
  participants: Participant[];
}

export const QuizSchema = SchemaFactory.createForClass(Quiz);