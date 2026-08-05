-- CreateEnum
CREATE TYPE "HarvestGrade" AS ENUM ('FIRST', 'SECOND', 'THIRD', 'BOLITA', 'RAYADO', 'ECHADO');

-- CreateTable
CREATE TABLE "harvest_items" (
    "id" UUID NOT NULL,
    "harvestId" UUID NOT NULL,
    "grade" "HarvestGrade" NOT NULL,
    "boxes" INTEGER NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "harvest_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "harvest_items_harvestId_grade_key" ON "harvest_items"("harvestId", "grade");

-- AddForeignKey
ALTER TABLE "harvest_items" ADD CONSTRAINT "harvest_items_harvestId_fkey" FOREIGN KEY ("harvestId") REFERENCES "harvests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
