import { useSyncExternalStore } from 'use-sync-external-store/shim';

type Callback = () => void;
type State = Record<string, unknown>;
type Store<T> = {
  [K in keyof T]: {
    subscribe: (listener: Callback) => Callback;
    getSnapshot: () => T[K];
    useSnapshot: () => T[K];
    setSnapshot: (val: T[K]) => void;
  };
};

let run = (fn: Callback) => {
  fn();
};
const __DEV__ = process.env.NODE_ENV !== 'production';

const resso = <T extends State>(state: T): T => {
  if (__DEV__ && Object.prototype.toString.call(state) !== '[object Object]') {
    throw new Error('object required');
  }

  const store: Store<T> = {} as Store<T>;

  Object.keys(state).forEach((key: keyof T) => {
    if (typeof state[key] === 'function') return;

    const listeners = new Set<Callback>();

    store[key] = {
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      getSnapshot: () => state[key],
      setSnapshot: (val) => {
        if (val === state[key]) return;
        state[key] = val;
        run(() => listeners.forEach((listener) => listener()));
      },
      useSnapshot: () => {
        return useSyncExternalStore(
          store[key].subscribe,
          store[key].getSnapshot
        );
      },
    };
  });

  return new Proxy(state, {
    get: (_, key: keyof T) => {
      try {
        return store[key].useSnapshot();
      } catch (e) {
        return state[key];
      }
    },
    set: (_, key: keyof T, val: T[keyof T]) => {
      store[key].setSnapshot(val);
      return true;
    },
  } as ProxyHandler<T>);
};

resso.config = ({ batch }: { batch: typeof run }) => {
  run = batch;
};

export default resso;
