export class MobileApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'MobileApiError';
    this.status = status;
  }
}
