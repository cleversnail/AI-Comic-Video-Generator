import { IsString, IsOptional, IsArray } from 'class-validator';

export class GenerateShotsDto {
  @IsString()
  story: string;

  @IsString()
  @IsOptional()
  style?: string;

  /**
   * @deprecated 使用 characterIds 替代，前端会自动注入角色描述
   */
  @IsArray()
  @IsOptional()
  characterDescriptions?: string[];

  /**
   * 要绑定到分镜生成的角色 ID 列表
   */
  @IsArray()
  @IsOptional()
  characterIds?: string[];
}
