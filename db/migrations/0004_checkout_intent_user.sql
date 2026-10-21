ALTER TABLE "checkout_intents" DROP CONSTRAINT IF EXISTS "checkout_intents_user_price";
--> statement-breakpoint
DELETE FROM "checkout_intents" a USING "checkout_intents" b WHERE a."userId" = b."userId" AND a."id" <> b."id" AND (b."transactionId" IS NOT NULL, b."expiresAt", b."id") > (a."transactionId" IS NOT NULL, a."expiresAt", a."id");
--> statement-breakpoint
ALTER TABLE "checkout_intents" ADD CONSTRAINT "checkout_intents_userId_unique" UNIQUE("userId");
