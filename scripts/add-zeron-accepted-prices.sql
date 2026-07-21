-- Apply: accepted unit-cost levels for Zeron Material Checker
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS "ZeronAcceptedUnitCost" (
  "id" TEXT NOT NULL,
  "itemCode" TEXT NOT NULL,
  "itemName" TEXT NOT NULL DEFAULT '',
  "unitCost" TEXT NOT NULL,
  "note" TEXT NOT NULL DEFAULT '',
  "deliveryRowId" TEXT,
  "markedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ZeronAcceptedUnitCost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ZeronAcceptedUnitCost_itemCode_unitCost_key"
  ON "ZeronAcceptedUnitCost"("itemCode", "unitCost");
CREATE INDEX IF NOT EXISTS "ZeronAcceptedUnitCost_itemCode_idx"
  ON "ZeronAcceptedUnitCost"("itemCode");
CREATE INDEX IF NOT EXISTS "ZeronAcceptedUnitCost_markedById_idx"
  ON "ZeronAcceptedUnitCost"("markedById");

DO $$ BEGIN
  ALTER TABLE "ZeronAcceptedUnitCost"
    ADD CONSTRAINT "ZeronAcceptedUnitCost_markedById_fkey"
    FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
