export const mpxCompilerCases = [
  {
    file: 'runtime-props.mpx',
    defaults: { title: 'hello', count: 1, profile: { name: 'mpx' } },
    exposed: { props: { title: 'hello', count: 1, profile: { name: 'mpx' } } },
  },
  {
    file: 'typed-defaults.mpx',
    defaults: { title: 'hello', profile: { name: 'mpx' }, count: 1 },
    exposed: { props: { title: 'hello', profile: { name: 'mpx' }, count: 1 } },
  },
  {
    file: 'runtime-props-js.mpx',
    defaults: { title: 'hello', count: 1 },
    exposed: { props: { title: 'hello', count: 1 } },
  },
  {
    file: 'destructured.mpx',
    defaults: { title: 'hello', count: 1 },
    exposed: { heading: 'hello' },
  },
  {
    file: 'macro-aliases.mpx',
    defaults: {},
    exposed: { props: { localCount: 5 } },
  },
  {
    file: 'type-imports.mpx',
    defaults: {},
    exposed: { result: { localCount: 5 } },
  },
  {
    file: 'namespace-import.mpx',
    defaults: {},
    exposed: { props: { localLabel: 'local' } },
  },
  {
    file: 'namespace-binding.mpx',
    defaults: { title: 'hello' },
    exposed: { props: { title: 'hello' } },
  },
  {
    file: 'hoisted-var.mpx',
    defaults: {},
    exposed: { props: { localCount: 5 } },
  },
  {
    file: 'hoisted-var-js.mpx',
    defaults: {},
    exposed: { props: { localCount: 5 } },
  },
  {
    file: 'hoisted-destructured.mpx',
    defaults: {},
    exposed: { props: { localCount: 5 } },
  },
  {
    file: 'scope-boundaries.mpx',
    defaults: { title: 'hello' },
    exposed: { props: { title: 'hello' } },
  },
  {
    file: 'mixed-bindings.mpx',
    defaults: { title: 'hello' },
    exposed: { props: { title: 'hello' }, summary: { localCount: 5 } },
  },
]
