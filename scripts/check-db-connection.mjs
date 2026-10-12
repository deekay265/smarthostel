import "dotenv/config";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.log("DATABASE_URL is missing.");
  process.exitCode = 1;
} else {
  const client = postgres(connectionString, { max: 1, connect_timeout: 5, prepare: false });
  try {
    await client`select 1`;
    console.log("PostgreSQL connection succeeded.");
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : "unknown";
    console.log(`PostgreSQL connection failed (${code}). Check database host, credentials, SSL, and network access.`);
    process.exitCode = 1;
  } finally {
    await client.end({ timeout: 2 }).catch(() => {});
  }
}
