import { Migration } from "@mikro-orm/migrations";

export class Migration20260319000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table if not exists "frisbii_config" ("id" text not null, "api_key_test" text not null default '', "api_key_live" text not null default '', "api_mode" text check ("api_mode" in ('test', 'live')) not null default 'test', "enabled" boolean not null default false, "title" text not null default 'Frisbii Pay', "display_type" text check ("display_type" in ('embedded', 'overlay', 'redirect')) not null default 'overlay', "send_order_lines" boolean not null default true, "send_phone_number" boolean not null default false, "auto_capture" boolean not null default false, "auto_create_invoice" boolean not null default false, "surcharge_fee_enabled" boolean not null default false, "save_card_enabled" boolean not null default false, "save_card_default_unchecked" boolean not null default false, "save_card_type" text check ("save_card_type" in ('cit', 'mit')) not null default 'cit', "cancel_on_payment_cancel" boolean not null default true, "update_payment_method" boolean not null default false, "send_order_email" boolean not null default true, "auto_cancel_enabled" boolean not null default false, "auto_cancel_timeout" integer not null default 30, "allowed_payment_methods" jsonb not null default '[]', "payment_icons" jsonb not null default '[]', "locale" text not null default 'en_GB', "checkout_configuration" text null, "webhook_secret" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "frisbii_config_pkey" primary key ("id"));`
    );

    this.addSql(
      `create table if not exists "frisbii_session" ("id" text not null, "session_handle" text not null, "charge_handle" text not null, "cart_id" text not null, "order_id" text null, "payment_session_id" text not null, "expires_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "frisbii_session_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_frisbii_session_session_handle" ON "frisbii_session" ("session_handle") WHERE "deleted_at" IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_frisbii_session_charge_handle" ON "frisbii_session" ("charge_handle") WHERE "deleted_at" IS NULL;`
    );

    this.addSql(
      `create table if not exists "frisbii_customer" ("id" text not null, "customer_id" text not null, "customer_email" text not null, "frisbii_handle" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "frisbii_customer_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_frisbii_customer_customer_id" ON "frisbii_customer" ("customer_id") WHERE "deleted_at" IS NULL;`
    );

    this.addSql(
      `create table if not exists "frisbii_payment_status" ("id" text not null, "order_id" text not null, "status" text check ("status" in ('pending', 'authorized', 'settled', 'refunded', 'cancelled', 'failed')) not null default 'pending', "masked_card" text null, "card_type" text null, "fingerprint" text null, "payment_method_type" text null, "surcharge_fee" integer null, "error" text null, "error_state" text null, "transactions" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "frisbii_payment_status_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_frisbii_payment_status_order_id" ON "frisbii_payment_status" ("order_id") WHERE "deleted_at" IS NULL;`
    );
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "frisbii_payment_status" cascade;`);
    this.addSql(`drop table if exists "frisbii_customer" cascade;`);
    this.addSql(`drop table if exists "frisbii_session" cascade;`);
    this.addSql(`drop table if exists "frisbii_config" cascade;`);
  }
}
