// Wrap async route handlers so rejected promises reach the error handler.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function notFound(req, res) {
  res.status(404).json({ error: 'Not found.' });
}

// eslint-disable-next-line no-unused-vars -- Express needs the 4-arg signature.
export function errorHandler(err, req, res, next) {
  if (err.code === '23505') {
    return res.status(409).json({ error: 'That value is already in use.' });
  }
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong on our end.' });
}

// Throw to return a specific status with a clear message.
export function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}
