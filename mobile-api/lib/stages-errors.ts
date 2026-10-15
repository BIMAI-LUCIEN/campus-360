// HTTP status for a failed stage operation. A database outage is a 503 (the
// client may retry); anything else is a 500. Never a fake success.

import { isDatabaseUnavailable } from './db-errors';

export { isDatabaseUnavailable };

export const stageErrorStatus = (error: unknown): 503 | 500 => (isDatabaseUnavailable(error) ? 503 : 500);
