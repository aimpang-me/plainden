ALTER TABLE "checkout_intents" DROP CONSTRAINT "checkout_intents_user_price";--> statement-breakpoint
ALTER TABLE "checkout_intents" ADD CONSTRAINT "checkout_intents_userId_unique" UNIQUE("userId");