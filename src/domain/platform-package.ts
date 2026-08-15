export function isPlatformPackage(name: string): boolean {
  return name === 'php' || name.startsWith('ext-');
}
