import { BooksService } from './books.service';

describe('BooksService', () => {
  it('passes recommendation keyword to Library Info API instead of forcing a fixed keyword', async () => {
    const libraryInfo = {
      recommendBooks: jest.fn().mockResolvedValue([
        { isbn: 'dynamic-isbn', title: 'Dynamic Recommendation' },
      ]),
    };
    const service = new BooksService({} as any, libraryInfo as any);

    await expect(service.recommend('철학', 2, 10)).resolves.toEqual([
      { isbn: 'dynamic-isbn', title: 'Dynamic Recommendation' },
    ]);
    expect(libraryInfo.recommendBooks).toHaveBeenCalledWith('철학', 2, 10);
  });
});
