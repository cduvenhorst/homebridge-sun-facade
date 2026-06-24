import type { UpdateMode } from './settings';

export function shouldWrite(
  previous: boolean | undefined,
  next: boolean,
  mode: UpdateMode,
): boolean {
  if (mode === 'always') {
    return true;
  }
  return previous !== next;
}
