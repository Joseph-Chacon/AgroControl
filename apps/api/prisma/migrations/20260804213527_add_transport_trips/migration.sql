-- CreateTable
CREATE TABLE "transport_trips" (
    "id" UUID NOT NULL,
    "cropId" UUID NOT NULL,
    "tripDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "transport_trips_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "transport_trips" ADD CONSTRAINT "transport_trips_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
