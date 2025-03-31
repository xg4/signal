/*
  Warnings:

  - You are about to drop the column `event_id` on the `recurrence_rules` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "recurrence_rules" DROP CONSTRAINT "recurrence_rules_event_id_fkey";

-- DropIndex
DROP INDEX "recurrence_rules_event_id_key";

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "recurrenceId" INTEGER;

-- AlterTable
ALTER TABLE "recurrence_rules" DROP COLUMN "event_id";

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_recurrenceId_fkey" FOREIGN KEY ("recurrenceId") REFERENCES "recurrence_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
