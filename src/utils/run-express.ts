import type { Express, Request, Response } from 'express';

export function runExpress(
  app: Express,
  req: Request,
  res: Response,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => {
      cleanup();
      resolve();
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      res.off('finish', done);
      res.off('close', done);
      res.off('error', onError);
    };

    res.on('finish', done);
    res.on('close', done);
    res.on('error', onError);

    app(req, res);
  });
}
