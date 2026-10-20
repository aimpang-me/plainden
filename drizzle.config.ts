import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: ["./db/schema.ts", "./tools/*/schema.ts"],
  out: "./db/migrations",
});
