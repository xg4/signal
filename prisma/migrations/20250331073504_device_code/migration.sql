/*
  Warnings:

  - A unique constraint covering the columns `[device_code]` on the table `subscriptions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_device_code_key" ON "subscriptions"("device_code");
