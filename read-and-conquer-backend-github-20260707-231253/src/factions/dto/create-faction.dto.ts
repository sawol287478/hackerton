import {
  IsHexColor,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateFactionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  name: string;

  @IsHexColor()
  color: string;

  @IsString()
  @IsIn(['FREE', 'APPROVAL'])
  joinType: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
