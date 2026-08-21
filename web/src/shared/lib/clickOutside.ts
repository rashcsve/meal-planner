export function isClickOutside(
  target: EventTarget | null,
  containerEl: HTMLElement | null,
  ignoreSelector: string,
): boolean {
  if (!(target instanceof HTMLElement)) return true;
  if (containerEl?.contains(target)) return false;
  if (target.closest(ignoreSelector)) return false;
  return true;
}
