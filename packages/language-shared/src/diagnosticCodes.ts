/** Public Mpx diagnostic IDs. Keep every value explicit, stable and unique. */
export enum MpxDiagnosticCode {
  TemplateWxForValueBrace = 1001,
  TemplateWxIfValueBrace = 1002,
  TemplateWxIfNoAdjacentBranch = 1003,
  JsonPathNotFound = 4001,
  JsonConfigValue = 4002,
  DuplicateInstanceField = 5001,
  ReservedInstanceData = 5002,
}

// Known spellings from existing releases and in-flight feature PRs. Match the
// source as well as the code so upstream diagnostics keep their own identities.
const legacyCodes: Readonly<
  Record<string, Readonly<Record<string, MpxDiagnosticCode>>>
> = {
  'mpx-json': { '4001': MpxDiagnosticCode.JsonPathNotFound },
  'mpx-json-schema': { 'config-value': MpxDiagnosticCode.JsonConfigValue },
  mpx: { 'reserved-instance-data': MpxDiagnosticCode.ReservedInstanceData },
}

export function resolveMpxDiagnosticCode(
  source: string | undefined,
  code: string | number | undefined,
): string | number | undefined {
  if (source === undefined || typeof code !== 'string') return code
  if (!Object.hasOwn(legacyCodes, source)) return code
  const codes = legacyCodes[source]
  return Object.hasOwn(codes, code) ? codes[code] : code
}
