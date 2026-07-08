import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsOptional, IsString, Min } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ok } from '../common/responses/api-response';
import { BooksService } from './books.service';

class SearchBooksQuery {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  pageNo?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  pageSize?: number = 20;
}

class BookExistQuery {
  @IsString()
  libCode: string;
}

@UseGuards(JwtAuthGuard)
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get('isbn/:isbn')
  async findByIsbn(@Param('isbn') isbn: string) {
    return ok(await this.booksService.findOrFetchByIsbn(isbn));
  }

  @Get('isbn/:isbn/exist')
  async checkExist(@Param('isbn') isbn: string, @Query() query: BookExistQuery) {
    return ok(await this.booksService.checkBookExists(query.libCode, isbn));
  }

  @Get('recommendations')
  async recommendations(@Query() query: SearchBooksQuery) {
    return ok(
      await this.booksService.recommend(
        query.keyword ?? '문학',
        query.pageNo ?? 1,
        query.pageSize ?? 20,
      ),
    );
  }

  @Get()
  async search(@Query() query: SearchBooksQuery) {
    return ok(
      await this.booksService.search(
        query.keyword ?? '',
        query.pageNo ?? 1,
        query.pageSize ?? 20,
      ),
    );
  }
}
