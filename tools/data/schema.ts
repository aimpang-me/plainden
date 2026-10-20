import { jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { user } from "../../db/schema";

export const dataPreset = pgTable(
  "data_presets",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    options: jsonb("options").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [unique("data_presets_user_name").on(table.userId, table.name)],
);
