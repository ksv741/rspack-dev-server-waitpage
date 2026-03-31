import type { Compiler } from '@rspack/core';
import { createBuildState } from './state';
import { createWaitPageMiddleware } from './middleware';

export interface RspackWaitPagePluginOptions {
  /** Browser tab title shown on the wait page. Default: "Building…" */
  title?: string;
  /** Stop intercepting requests after the first successful build. Default: true */
  disableAfterFirstBuild?: boolean;
  /**
   * Artificial delay in ms added after the build finishes before the wait page
   * disappears. Useful for testing/debugging the wait page UI. Default: 0
   */
  delay?: number;
  /**
   * How often (in ms) the browser polls the /progress endpoint.
   * Lower values = smoother progress bar, slightly more requests. Default: 100
   */
  pollInterval?: number;
}

const PLUGIN_NAME = 'RspackWaitPagePlugin';

export class RspackWaitPagePlugin {
  private readonly options: Required<RspackWaitPagePluginOptions>;


  constructor(options: RspackWaitPagePluginOptions = {}) {
    this.options = {
      title: options.title ?? 'Building…',
      disableAfterFirstBuild: options.disableAfterFirstBuild ?? true,
      delay: options.delay ?? 0,
      pollInterval: options.pollInterval ?? 100,
    };
  }

  apply(compiler: Compiler): void {
    const buildState = createBuildState();

    // Rspack ProgressPlugin internally does: userFn(percentage, msg, ...items)
    // where items is string[] from Rust. In practice rspack passes exactly one
    // item: either the current module path (file path) or a phase label like
    // "compilation" / "finish make". There are no separate modules-count or
    // active-modules fields — those are webpack-only.
    new compiler.webpack.ProgressPlugin((
      percentage: number,
      message: string,
      ...args: string[]
    ) => {
      buildState.percentage = Math.round(percentage * 100);
      buildState.message = message ?? '';

      // args[0] is either a module path (contains '/') or a phase label like
      // "finish make" / "plugins". We keep both — the template decides display.
      buildState.moduleName = args[0] ?? '';
    }).apply(compiler);

    // Initial build start (watch mode)
    compiler.hooks.watchRun.tap(PLUGIN_NAME, () => {
      buildState.isBuilding = true;
      buildState.percentage = 0;
      buildState.message = 'starting';
    });

    // File changed — rebuild started
    compiler.hooks.invalid.tap(PLUGIN_NAME, () => {
      buildState.isBuilding = true;
      buildState.percentage = 0;
      buildState.message = '';
    });

    // Build finished (success or error — let HMR overlay handle errors).
    // tapPromise lets us hold `isBuilding=true` for an artificial delay before
    // the browser polling detects completion and triggers location.reload().
    compiler.hooks.done.tapPromise(PLUGIN_NAME, async () => {
      buildState.percentage = 100;
      buildState.message = 'done';

      if (this.options.delay > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, this.options.delay));
      }

      buildState.isBuilding = false;
      buildState.hasBeenValid = true;
    });

    // Inject middleware by wrapping setupMiddlewares before the dev server starts.
    // afterEnvironment fires after user config is applied but before server boot.
    compiler.hooks.afterEnvironment.tap(PLUGIN_NAME, () => {
      const devServerOptions = (compiler.options as { devServer?: Record<string, unknown> }).devServer;

      // No devServer config — running as `rspack build`, nothing to do
      if (!devServerOptions) return;

      const originalSetupMiddlewares = devServerOptions['setupMiddlewares'] as
        | ((middlewares: unknown[], devServer: unknown) => unknown[])
        | undefined;

      const middleware = createWaitPageMiddleware(buildState, {
        title: this.options.title,
        disableAfterFirstBuild: this.options.disableAfterFirstBuild,
        pollInterval: this.options.pollInterval,
      });

      devServerOptions['setupMiddlewares'] = (
        middlewares: unknown[],
        devServer: unknown
      ): unknown[] => {
        // Prepend our middleware so it runs before all others
        middlewares.unshift({ name: PLUGIN_NAME, middleware });

        if (typeof originalSetupMiddlewares === 'function') {
          return originalSetupMiddlewares(middlewares, devServer);
        }
        return middlewares;
      };
    });
  }
}
