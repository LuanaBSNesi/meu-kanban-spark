CREATE TABLE "google_accounts" (
	"email" text PRIMARY KEY NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp with time zone,
	"scope" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TRIGGER google_accounts_set_updated_at BEFORE UPDATE ON google_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
