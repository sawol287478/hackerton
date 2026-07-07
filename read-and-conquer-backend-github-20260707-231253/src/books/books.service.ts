import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessCode } from '../common/exceptions/business-code';
import { BusinessException } from '../common/exceptions/business.exception';
import { LibraryInfoClient } from '../integrations/services/library-info.client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly libraryInfo: LibraryInfoClient,
  ) {}

  async findOrFetchByIsbn(isbn: string) {
    const existing = await this.prisma.book.findUnique({ where: { isbn } });
    if (existing) {
      return existing;
    }

    const external = await this.libraryInfo.findBookByIsbn(isbn);
    if (!external) {
      throw new BusinessException(
        BusinessCode.BOOK_NOT_FOUND,
        'Book not found from Library Info API',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.prisma.book.create({
      data: {
        isbn: external.isbn,
        title: external.title,
        author: external.author,
        publisher: external.publisher,
        coverImageUrl: external.coverImageUrl,
        totalPages: external.totalPages,
      },
    });
  }

  async search(keyword: string, pageNo = 1, pageSize = 20) {
    if (!keyword.trim()) {
      return [];
    }
    return this.libraryInfo.searchBooks(keyword, pageNo, pageSize);
  }

  async checkBookExists(libCode: string, isbn: string) {
    return this.libraryInfo.checkBookExists(libCode, isbn);
  }

  async recommend(keyword: string, pageNo = 1, pageSize = 20) {
    return this.libraryInfo.recommendBooks(keyword, pageNo, pageSize);
  }
}
