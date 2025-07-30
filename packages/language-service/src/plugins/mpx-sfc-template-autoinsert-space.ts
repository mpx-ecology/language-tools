import type { LanguageServicePlugin } from '@volar/language-service'

export function create(): LanguageServicePlugin {
  return {
    name: 'mpx-sfc-template-autoinsert-space',

    capabilities: {
      autoInsertionProvider: {
        triggerCharacters: ['}'],
        configurationSections: ['mpx.format.template.bracketSpacing'],
      },
    },

    create(context) {
      return {
        async provideAutoInsertSnippet(document, selection, change) {
          if (document.languageId === 'html') {
            const enabled =
              (await context.env.getConfiguration?.<
                'true' | 'false' | 'preserve'
              >('mpx.format.template.bracketSpacing')) === 'true'
            if (!enabled) {
              return
            }

            if (
              change.text === '{}' &&
              document
                .getText()
                .slice(change.rangeOffset - 1, change.rangeOffset + 3) ===
                '{{}}' &&
              document.offsetAt(selection) === change.rangeOffset + 1
            ) {
              return ` $0 `
            }
          }
        },
      }
    },
  }
}
