import { Request, Response, NextFunction } from 'express';

// Central error handler — ALL unhandled errors route here.
// Never expose stack traces or internal details to the client.
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  // Log full details server-side only
  if (process.env.NODE_ENV === 'development') {
    console.error(`[Error] ${req.method} ${req.path}:`, err.message);
  }

  // Return generic message to client — no internal info
  res.status(500).json({ error: 'An unexpected error occurred' });
};

// 404 handler — catches any route not matched above
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
};
