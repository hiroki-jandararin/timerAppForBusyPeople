type Listener = () => void;
const listeners = new Set<Listener>();

export function onRoutineChanged(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitRoutineChanged(): void {
  listeners.forEach((fn) => fn());
}
