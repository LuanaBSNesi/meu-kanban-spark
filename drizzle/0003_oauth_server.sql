CREATE TABLE "oauth_clients" (
	"client_id" text PRIMARY KEY NOT NULL,
	"client_secret" text,
	"client_name" text DEFAULT '' NOT NULL,
	"redirect_uris" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"code_challenge" text,
	"code_challenge_method" text,
	"scope" text DEFAULT '' NOT NULL,
	"user_email" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_tokens" (
	"token" text PRIMARY KEY NOT NULL,
	"refresh_token" text,
	"client_id" text NOT NULL,
	"user_email" text NOT NULL,
	"scope" text DEFAULT '' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "oauth_tokens_refresh_idx" ON "oauth_tokens" USING btree ("refresh_token");--> statement-breakpoint
CREATE TRIGGER oauth_clients_set_updated_at BEFORE UPDATE ON oauth_clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();