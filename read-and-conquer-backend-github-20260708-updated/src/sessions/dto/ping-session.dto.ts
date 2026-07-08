import { IsInt, IsLatitude, IsLongitude, IsOptional, Min } from 'class-validator';

export class PingSessionDto {
  @IsInt()
  sessionId: number;

  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;

  @IsOptional()
  @Min(0)
  accuracyMeters?: number;
}
