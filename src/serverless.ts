import 'reflect-metadata';
import type { Request, Response } from 'express';
import type { Express } from 'express';
import { createNestExpressApp } from './bootstrap';

let cachedServer: Express | null = null;

async function getServer(): Promise<Express> {
  if (!cachedServer) {
    cachedServer = await createNestExpressApp();
  }
  return cachedServer;
}

async function handler(req: Request, res: Response): Promise<void> {
  const server = await getServer();
  server(req, res);
}

export = handler;
