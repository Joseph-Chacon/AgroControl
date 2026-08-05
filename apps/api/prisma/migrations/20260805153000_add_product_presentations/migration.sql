-- Presentaciones comerciales que se convierten a la unidad base del producto.
CREATE TABLE "product_presentations" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contentQuantity" DECIMAL(18,4) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_presentations_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "purchase_items"
    ADD COLUMN "presentationId" UUID,
    ADD COLUMN "packageQuantity" DECIMAL(18,4);

CREATE UNIQUE INDEX "product_presentations_productId_name_key" ON "product_presentations"("productId", "name");
CREATE INDEX "purchase_items_presentationId_idx" ON "purchase_items"("presentationId");

ALTER TABLE "product_presentations"
    ADD CONSTRAINT "product_presentations_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "purchase_items"
    ADD CONSTRAINT "purchase_items_presentationId_fkey"
    FOREIGN KEY ("presentationId") REFERENCES "product_presentations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
