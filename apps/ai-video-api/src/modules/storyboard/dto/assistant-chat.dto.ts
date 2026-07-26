import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatMessage {
  @IsString()
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

export class AssistantChatDto {
  @IsString()
  message: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ChatMessage)
  history?: ChatMessage[];

  @IsString()
  @IsOptional()
  context?: string;
}
