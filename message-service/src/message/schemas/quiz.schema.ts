import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type QuizDocument = Quiz & Document;

@Schema()
class Answer {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  text: string;

  @Prop({ required: true })
  isCorrect: boolean;
}

const AnswerSchema = SchemaFactory.createForClass(Answer);

@Schema()
class Question {
  @Prop({ required: true })
  questionId: string;

  @Prop({ required: true })
  question: string;

  @Prop({ type: [AnswerSchema], required: true })
  answers: Answer[];

  @Prop()
  media?: string;
}

const QuestionSchema = SchemaFactory.createForClass(Question);

@Schema()
class Participant {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, default: 0 })
  score: number;
}

const ParticipantSchema = SchemaFactory.createForClass(Participant);

@Schema()
export class Quiz {
  @Prop()
  _id: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ type: [QuestionSchema], required: true })
  questions: Question[];

  @Prop({ type: [ParticipantSchema], default: [] })
  participants: Participant[];
}

export const QuizSchema = SchemaFactory.createForClass(Quiz);
