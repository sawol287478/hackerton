import { IsInt, IsLatitude, IsLongitude } from 'class-validator';

export class PingSessionDto {
  @IsInt()
  sessionId: number;

  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;
}
