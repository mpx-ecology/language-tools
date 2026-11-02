import fs from 'node:fs'
import path from 'node:path'
import * as ts from 'typescript'

const runtime = ts as typeof ts & {
  setLocalizedDiagnosticMessages(
    messages: Record<string, string> | undefined,
  ): void
}

// TypeScript's locale is process-wide; always restore it before the next test.
export async function withDiagnosticLocale<T>(
  locale: 'en' | 'zh-cn',
  action: () => T | Promise<T>,
): Promise<T> {
  const messages =
    locale === 'en'
      ? undefined
      : (JSON.parse(
          fs.readFileSync(
            path.join(
              path.dirname(ts.sys.getExecutingFilePath()),
              locale,
              'diagnosticMessages.generated.json',
            ),
            'utf8',
          ),
        ) as Record<string, string>)
  runtime.setLocalizedDiagnosticMessages(messages)
  try {
    return await action()
  } finally {
    runtime.setLocalizedDiagnosticMessages(undefined)
  }
}
