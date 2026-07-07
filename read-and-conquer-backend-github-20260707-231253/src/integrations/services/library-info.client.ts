import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ExternalBook {
  isbn: string;
  title: string;
  author?: string;
  publisher?: string;
  coverImageUrl?: string;
  totalPages?: number;
  description?: string;
}

export interface ExternalLibrary {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  region?: string;
  code?: string;
}

@Injectable()
export class LibraryInfoClient {
  private readonly baseUrl = 'http://data4library.kr/api';

  constructor(private readonly config: ConfigService) {}

  async findBookByIsbn(isbn: string): Promise<ExternalBook | null> {
    const json = await this.getJson('/srchDtlList', {
      isbn13: isbn,
      loaninfoYN: 'Y',
    });
    const book = this.unwrapFirst(json?.response?.detail, 'book');
    if (!book) {
      return null;
    }

    return {
      isbn: String(book.isbn13 ?? book.isbn ?? isbn),
      title: String(book.bookname ?? book.title ?? 'Unknown title'),
      author: book.authors,
      publisher: book.publisher,
      coverImageUrl: book.bookImageURL,
      totalPages: this.parseOptionalInt(book.bookDtlUrl ? undefined : book.page),
      description: book.description,
    };
  }

  async searchBooks(keyword: string, pageNo = 1, pageSize = 20) {
    const json = await this.getJson('/srchBooks', {
      keyword,
      pageNo: String(pageNo),
      pageSize: String(pageSize),
    });
    const docs = this.unwrapList(json?.response?.docs, 'doc');
    return docs.map((book) => ({
      isbn: String(book.isbn13 ?? book.isbn ?? ''),
      title: String(book.bookname ?? book.title ?? ''),
      author: book.authors,
      publisher: book.publisher,
      coverImageUrl: book.bookImageURL,
    }));
  }

  async searchLibraries(pageNo = 1, pageSize = 100) {
    const json = await this.getJson('/libSrch', {
      pageNo: String(pageNo),
      pageSize: String(pageSize),
    });
    const libs = this.unwrapList(json?.response?.libs, 'lib');

    return libs.map((library) => ({
      name: String(library.libName ?? library.name ?? ''),
      address: String(library.address ?? ''),
      region: String(library.region ?? library.area ?? ''),
      code: library.libCode ? String(library.libCode) : undefined,
    }));
  }

  async checkBookExists(libCode: string, isbn: string) {
    const json = await this.getJson('/bookExist', {
      libCode,
      isbn13: isbn,
    });
    const result = json?.response?.result;
    return {
      exists: result?.hasBook === 'Y',
      available: result?.loanAvailable === 'Y',
      raw: result,
    };
  }

  async recommendBooks(keyword = '문학', pageNo = 1, pageSize = 20) {
    return this.searchBooks(keyword, pageNo, pageSize);
  }

  private async getJson(path: string, params: Record<string, string>) {
    const apiKey = this.config.get<string>('LIBRARY_API_KEY');
    if (!apiKey) {
      return null;
    }

    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set('authKey', apiKey);
    url.searchParams.set('format', 'json');
    Object.entries(params).forEach(([key, value]) =>
      url.searchParams.set(key, value),
    );

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Library Info API failed: ${response.status}`);
    }
    return response.json();
  }

  private unwrapFirst(source: unknown, key: string) {
    return this.unwrapList(source, key)[0];
  }

  private unwrapList(source: unknown, key: string): any[] {
    if (!Array.isArray(source)) {
      return [];
    }
    return source.map((item) => item?.[key] ?? item).filter(Boolean);
  }

  private parseOptionalInt(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
