/** 让 BaseView 能关页，又不和 UIManager 互相 import。 */
type Closer = (view: object) => void;

let closer: Closer | null = null;

export function bindViewCloser(fn: Closer): void {
  closer = fn;
}

export function requestViewClose(view: object): void {
  if (closer) closer(view);
}
