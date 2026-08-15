export function toGlobalInstallSpec(name: string, constraint: string): string {
  const trimmed = typeof constraint === 'string' ? constraint.trim() : '';
  if (!trimmed) {
    return name;
  }

  return `${name}:${trimmed}`;
}
