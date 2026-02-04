/*
  Warnings:

  - Changed the type of `startTime` on the `AvailabilityRule` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `endTime` on the `AvailabilityRule` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "AvailabilityRule" DROP COLUMN "startTime",
ADD COLUMN     "startTime" INTEGER NOT NULL,
DROP COLUMN "endTime",
ADD COLUMN     "endTime" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "ProviderProfile" ADD COLUMN     "timeZone" TEXT NOT NULL DEFAULT 'America/Argentina/Mendoza';
