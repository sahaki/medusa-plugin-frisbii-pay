import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260427000000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`ALTER TABLE "frisbii_config" RENAME COLUMN "auto_create_invoice" TO "auto_fulfill_items";`);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "frisbii_config" RENAME COLUMN "auto_fulfill_items" TO "auto_create_invoice";`);
  }

}
