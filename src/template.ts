import * as fs from 'fs';
import * as path from 'path';
import * as ejs from 'ejs';

export interface TemplateOptions {
  title: string;
  percentage: number;
  message: string;
  moduleName: string;
  pollInterval: number;
  progressEndpoint: string;
  theme: 'light' | 'dark';
}

function compileTemplate(templatePath: string): ejs.TemplateFunction {
  return ejs.compile(fs.readFileSync(templatePath, 'utf-8'), { filename: templatePath });
}

const templates = {
  dark: compileTemplate(path.join(__dirname, 'templates/themes/default.template.ejs')),
  light: compileTemplate(path.join(__dirname, 'templates/themes/dark.template.ejs')),
};

export function renderWaitPage({
  title,
  percentage,
  message,
  moduleName,
  pollInterval,
  progressEndpoint,
  theme,
}: TemplateOptions): string {
  return templates[theme]({
    title,
    message,
    moduleName: formatDetail(moduleName),
    percentage,
    pollInterval,
    progressEndpointJson: JSON.stringify(progressEndpoint),
  });
}

/**
 * For file paths: keep last 2 segments to avoid overflow.
 * For phase labels ("finish make", "plugins"): show as-is.
 */
function formatDetail(value: string): string {
  if (!value) return '';
  if (!value.includes('/')) return value;
  const parts = value.replace(/\\/g, '/').split('/');
  return parts.length > 2 ? '\u2026/' + parts.slice(-2).join('/') : value;
}
