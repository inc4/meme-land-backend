export class RequestInputsParser {
  static parseRequestQueryParam(conditions = {}) {
    return RequestInputsParser.safeQueryParamParse(conditions) ?? {};
  }

  static safeParse(str, reviver, space) {
    if (!str || typeof str !== 'string') return null;
    try {
      return JSON.parse(str, reviver, space);
    } catch (err) {
      return null;
    }
  }

  static safeQueryParamParse(str, reviver, space) {
    if (str && typeof str === 'string') {
      return RequestInputsParser.safeParse(decodeURIComponent(str), reviver, space);
    }
    return null;
  }
}
