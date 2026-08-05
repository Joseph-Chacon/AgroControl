-- Revertir el catálogo de presentaciones comerciales; las compras vuelven a usar la unidad base.
ALTER TABLE "purchase_items"
    DROP COLUMN "presentationId",
    DROP COLUMN "packageQuantity";

DROP TABLE "product_presentations";
