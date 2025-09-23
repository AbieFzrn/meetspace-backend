export function getEnv(key: string, fallback?: string): string {
  const value = process.env[key];
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
