CREATE TYPE "public"."county" AS ENUM('臺北市', '新北市', '桃園市', '臺中市', '臺南市', '高雄市', '基隆市', '新竹市', '嘉義市', '新竹縣', '苗栗縣', '彰化縣', '南投縣', '雲林縣', '嘉義縣', '屏東縣', '宜蘭縣', '花蓮縣', '臺東縣', '澎湖縣', '金門縣', '連江縣');--> statement-breakpoint
CREATE TYPE "public"."signup_status" AS ENUM('pending', 'approved', 'shipped', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."skin_type" AS ENUM('oily', 'combination', 'dry', 'normal', 'sensitive', 'unsure');--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" varchar(60) NOT NULL,
	"action" varchar(40) NOT NULL,
	"target" text
);
--> statement-breakpoint
CREATE TABLE "trial_signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" varchar(40) NOT NULL,
	"email" varchar(254) NOT NULL,
	"school" varchar(60),
	"county" "county" NOT NULL,
	"skin_type" "skin_type" NOT NULL,
	"commute_minutes" smallint NOT NULL,
	"referral_code" varchar(12) NOT NULL,
	"referred_by" varchar(12),
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"consent_version" varchar(20) NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"status" "signup_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone DEFAULT now() + interval '1 year' NOT NULL
);
--> statement-breakpoint
CREATE INDEX "admin_audit_at_idx" ON "admin_audit_log" USING btree ("at");--> statement-breakpoint
CREATE UNIQUE INDEX "trial_signups_email_uq" ON "trial_signups" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "trial_signups_referral_uq" ON "trial_signups" USING btree ("referral_code");--> statement-breakpoint
CREATE INDEX "trial_signups_created_idx" ON "trial_signups" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "trial_signups_referred_by_idx" ON "trial_signups" USING btree ("referred_by");