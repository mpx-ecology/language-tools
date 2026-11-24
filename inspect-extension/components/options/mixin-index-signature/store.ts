export interface StoreState {
  showFallback: boolean
}

export interface StoreGetters {
  statusText(): 'fallback' | 'active'
}

export interface StoreActions {
  refreshData(): Promise<string>
}

export interface TypedStore<S, G, A> {
  state: S
  mapState<K extends keyof S>(keys: K[]): { [I in K]: () => S[I] }
  mapGetters<K extends keyof G>(keys: K[]): Pick<G, K>
  mapActions<K extends keyof A>(keys: K[]): Pick<A, K>
}

const store: TypedStore<StoreState, StoreGetters, StoreActions> = {
  state: {
    showFallback: false,
  },
  mapState(keys) {
    return Object.fromEntries(
      keys.map((key) => [key, () => store.state[key]]),
    ) as any
  },
  mapGetters(keys) {
    return Object.fromEntries(keys.map((key) => [key, () => 'active'])) as any
  },
  mapActions(keys) {
    return Object.fromEntries(keys.map((key) => [key, async () => 'ok'])) as any
  },
}

export default store
