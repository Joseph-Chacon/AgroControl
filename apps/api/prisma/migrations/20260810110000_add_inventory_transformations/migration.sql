-- Preparaciones: convierten varios productos de inventario en uno nuevo,
-- conservando el costo de los insumos y cada movimiento de existencias.
ALTER TYPE "MovementType" ADD VALUE 'TRANSFORMATION_IN';
ALTER TYPE "MovementType" ADD VALUE 'TRANSFORMATION_OUT';

CREATE TABLE "inventory_transformations" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "outputProductId" UUID NOT NULL,
    "outputQuantity" DECIMAL(18,4) NOT NULL,
    "totalCost" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isVoided" BOOLEAN NOT NULL DEFAULT false,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,

    CONSTRAINT "inventory_transformations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_transformation_items" (
    "id" UUID NOT NULL,
    "transformationId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,6) NOT NULL,
    "totalCost" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "inventory_transformation_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inventory_transformations_code_key" ON "inventory_transformations"("code");
CREATE INDEX "inventory_transformation_items_productId_idx" ON "inventory_transformation_items"("productId");

ALTER TABLE "inventory_transformations"
    ADD CONSTRAINT "inventory_transformations_outputProductId_fkey"
    FOREIGN KEY ("outputProductId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_transformation_items"
    ADD CONSTRAINT "inventory_transformation_items_transformationId_fkey"
    FOREIGN KEY ("transformationId") REFERENCES "inventory_transformations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_transformation_items"
    ADD CONSTRAINT "inventory_transformation_items_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
