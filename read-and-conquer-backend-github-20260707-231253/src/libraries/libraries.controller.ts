import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsOptional, IsString, Min } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ok } from '../common/responses/api-response';
import { ListLibrariesDto } from './dto/list-libraries.dto';
import { LibrariesService } from './libraries.service';

class SyncLibrariesQuery {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  pageNo?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  pageSize?: number = 50;
}

class SearchNearbyLibrariesQuery extends ListLibrariesDto {}

class NationwideLibrariesQuery {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  pageNo?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  pageSize?: number = 100;
}

class GeocodeAddressQuery {
  @IsString()
  address: string;
}

@UseGuards(JwtAuthGuard)
@Controller('libraries')
export class LibrariesController {
  constructor(private readonly librariesService: LibrariesService) {}

  @Get()
  async list(@Query() query: ListLibrariesDto) {
    return this.librariesService.findNearby(query);
  }

  @Get('nationwide')
  async nationwide(@Query() query: NationwideLibrariesQuery) {
    return ok(
      await this.librariesService.findNationwide(
        query.pageNo ?? 1,
        query.pageSize ?? 100,
      ),
    );
  }

  @Get('nearby/search')
  async searchNearby(@Query() query: SearchNearbyLibrariesQuery) {
    return ok(await this.librariesService.searchNearbyFromKakao(query));
  }

  @Get('geocode')
  async geocode(@Query() query: GeocodeAddressQuery) {
    return ok(await this.librariesService.geocodeAddress(query.address ?? ''));
  }

  @Post('sync')
  async sync(@Query() query: SyncLibrariesQuery) {
    return ok(
      await this.librariesService.syncFromLibraryInfo(
        query.pageNo ?? 1,
        query.pageSize ?? 50,
      ),
    );
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    return this.librariesService.findDetail(id);
  }
}
