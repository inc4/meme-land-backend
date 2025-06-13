export class HttpErrorBody {
  static compose(code, message) {
    return {
      code,
      message,
    };
  }
}

