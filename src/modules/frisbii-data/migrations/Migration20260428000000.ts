import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260428000000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`ALTER TABLE "frisbii_config" ADD COLUMN IF NOT EXISTS "debug_enabled" boolean NOT NULL DEFAULT false;`);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "frisbii_config" DROP COLUMN IF EXISTS "debug_enabled";`);
  }

}
