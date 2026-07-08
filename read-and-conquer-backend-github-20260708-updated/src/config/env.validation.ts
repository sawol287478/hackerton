type Env = Record<string, string | undefined>;

export function validateEnv(config: Env) {
  const databaseUrl = config.DATABASE_URL;
  const directUrl = config.DIRECT_URL;

  if (!databaseUrl || databaseUrl.includes('[PROJECT-REF]')) {
    throw new Error('DATABASE_URL must be set to your Supabase pooled URL');
  }

  if (!directUrl || directUrl.includes('[PROJECT-REF]')) {
    throw new Error('DIRECT_URL must be set to your Supabase direct URL');
  }

  if (!config.JWT_SECRET || config.JWT_SECRET === 'change-me') {
    throw new Error('JWT_SECRET must be changed before running the server');
  }

  return config;
}
