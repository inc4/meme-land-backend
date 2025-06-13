export class DataPageComposer {
  static composePageInfo(data, page, collectionTotalLength) {
    return {
      totalItems: collectionTotalLength,
      page: {
        index: page?.index ?? 0,
        size: data.length,
        sort: {
          property: page?.sort?.property,
          direction: page?.sort?.direction,
        },
        data: data,
      },
    };
  }
}
