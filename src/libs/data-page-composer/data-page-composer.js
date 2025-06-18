export class DataPageComposer {
  // Create data page info from mongoose-paginate-v2 paginate call result.
  // result = {
  //   "docs": [...],
  //   "totalDocs": 100,
  //   "limit": 10,
  //   "page": 1,
  //   "totalPages": 10,
  //   "pagingCounter": 1,
  //   "hasPrevPage": false,
  //   "hasNextPage": true
  // }
  static composePageInfo(result) {
    return {
      totalItems: result.totalDocs,
      page: {
        index: result.page - 1, // paginate use 1 as first page
        size: result.docs.length,
        data: result.docs,
      },
    };
  }
}
