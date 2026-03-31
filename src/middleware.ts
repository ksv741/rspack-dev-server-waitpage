import type { IncomingMessage, ServerResponse } from 'http';
import { BuildState } from './state';
import { renderWaitPage } from './template';

export interface MiddlewareOptions {
  title: string;
  disableAfterFirstBuild: boolean;
  pollInterval: number;
}

type NextFunction = () => void;

export const PROGRESS_ENDPOINT = '/rspack-wait-page/progress';

export function createWaitPageMiddleware(
  buildState: BuildState,
  options: MiddlewareOptions
) {
  return function waitPageMiddleware(
    req: IncomingMessage,
    res: ServerResponse,
    next: NextFunction
  ): void {
    // Serve the JSON progress endpoint (used by the polling script)
    if (req.method === 'GET' && req.url === PROGRESS_ENDPOINT) {
      const body = JSON.stringify({
        isBuilding: buildState.isBuilding,
        percentage: buildState.percentage,
        message: buildState.message,
        moduleName: buildState.moduleName,
      });
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      });
      res.end(body);
      return;
    }

    // After first successful build, let the real app handle everything
    if (options.disableAfterFirstBuild && buildState.hasBeenValid) {
      next();
      return;
    }

    // Not building — let the real app respond
    if (!buildState.isBuilding) {
      next();
      return;
    }

    // Only intercept top-level document navigations (not JS/CSS/fonts/etc.)
    const accept = req.headers['accept'] ?? '';
    if (!accept.includes('text/html')) {
      next();
      return;
    }

    const html = renderWaitPage({
      title: options.title,
      percentage: buildState.percentage,
      message: buildState.message,
      moduleName: buildState.moduleName,
      pollInterval: options.pollInterval,
      progressEndpoint: PROGRESS_ENDPOINT,
    });

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(html);
  };
}
