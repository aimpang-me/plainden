CREATE TABLE IF NOT EXISTS "checkout_intents" (
  "id" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL,
  "priceLookupKey" text NOT NULL,
  "transactionId" text,
  "createdAt" timestamp with time zone NOT NULL,
  "expiresAt" timestamp with time zone NOT NULL,
  CONSTRAINT "checkout_intents_user_price" UNIQUE("userId", "priceLookupKey"),
  CONSTRAINT "checkout_intents_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE cascade
);
