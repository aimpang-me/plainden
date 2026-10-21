ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "providerCustomerId" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_providerCustomerId_unique" ON "user" ("providerCustomerId");
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'stripeCustomerId'
  ) THEN
    ALTER TABLE "subscriptions" RENAME COLUMN "stripeCustomerId" TO "providerCustomerId";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'stripeSubscriptionId'
  ) THEN
    ALTER TABLE "subscriptions" RENAME COLUMN "stripeSubscriptionId" TO "providerSubscriptionId";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'stripeEventCreated'
  ) THEN
    ALTER TABLE "subscriptions" RENAME COLUMN "stripeEventCreated" TO "providerEventAt";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'providerEventAt' AND data_type = 'integer'
  ) THEN
    ALTER TABLE "subscriptions"
      ALTER COLUMN "providerEventAt" TYPE timestamp with time zone
      USING to_timestamp("providerEventAt");
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "processed_events" (
  "id" text PRIMARY KEY NOT NULL,
  "occurredAt" timestamp with time zone NOT NULL
);
