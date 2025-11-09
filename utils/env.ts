export const readEnv = (key: string): string | undefined => {
  if (typeof import.meta !== 'undefined' && import.meta.env && key in import.meta.env) {
    const value = import.meta.env[key as keyof ImportMetaEnv];
    if (typeof value === 'string') {
      return value;
    }
  }
  return process.env[key as keyof NodeJS.ProcessEnv];
};
