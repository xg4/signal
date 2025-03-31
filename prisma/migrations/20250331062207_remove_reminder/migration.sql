/*
  Warnings:

  - You are about to drop the `reminders` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "reminders" DROP CONSTRAINT "reminders_event_id_fkey";

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "reminder_times" INTEGER[];

-- DropTable
DROP TABLE "reminders";
