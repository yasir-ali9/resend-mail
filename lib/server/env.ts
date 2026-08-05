import "server-only";

type ServerVariable = "DATABASE_URL";

export function getServerEnv(name: ServerVariable) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }

  return value;
}
