-- Apply: Zeron Material Checker tables (owner: zeron)
-- Safe to re-run. Does NOT drop or alter existing Meavo tables.

DO $$ BEGIN
  CREATE TYPE "SystemRole" AS ENUM ('ADMIN', 'USER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ZeronImportSourceType" AS ENUM ('GOOGLE_SHEET_TAB', 'CSV_UPLOAD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ZeronImportStatus" AS ENUM ('PENDING', 'SUCCESS', 'PARTIAL', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- User table already exists in shared Meavo DB. Only create if missing (standalone Neon).
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "passwordHash" TEXT,
  "systemRole" "SystemRole" NOT NULL DEFAULT 'USER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE TABLE IF NOT EXISTS "ZeronSheetState" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "spreadsheetId" TEXT NOT NULL DEFAULT '',
  "lastSyncedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ZeronSheetState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ZeronImportRun" (
  "id" TEXT NOT NULL,
  "sourceType" "ZeronImportSourceType" NOT NULL,
  "sourceName" TEXT NOT NULL,
  "status" "ZeronImportStatus" NOT NULL DEFAULT 'PENDING',
  "triggeredById" TEXT,
  "rowCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "errorCount" INTEGER NOT NULL DEFAULT 0,
  "errors" TEXT NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "ZeronImportRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ZeronImportRun_createdAt_idx" ON "ZeronImportRun"("createdAt");
CREATE INDEX IF NOT EXISTS "ZeronImportRun_sourceType_idx" ON "ZeronImportRun"("sourceType");

CREATE TABLE IF NOT EXISTS "ZeronImportedTab" (
  "id" TEXT NOT NULL,
  "spreadsheetId" TEXT NOT NULL,
  "tabName" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "rowCount" INTEGER NOT NULL DEFAULT 0,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "importRunId" TEXT,
  CONSTRAINT "ZeronImportedTab_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ZeronImportedTab_spreadsheetId_tabName_key"
  ON "ZeronImportedTab"("spreadsheetId", "tabName");
CREATE INDEX IF NOT EXISTS "ZeronImportedTab_spreadsheetId_idx"
  ON "ZeronImportedTab"("spreadsheetId");

CREATE TABLE IF NOT EXISTS "ZeronDeliveryRow" (
  "id" TEXT NOT NULL,
  "importRunId" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "processNumber" TEXT NOT NULL,
  "deliveryDate" TIMESTAMP(3) NOT NULL,
  "itemCode" TEXT NOT NULL,
  "itemName" TEXT NOT NULL DEFAULT '',
  "stockQuantity" TEXT,
  "unit" TEXT,
  "unitCost" TEXT NOT NULL,
  "totalCost" TEXT,
  "warehouse" TEXT,
  "extraCost" TEXT,
  "itemType" TEXT,
  "sourceFileName" TEXT,
  "attachmentPresent" BOOLEAN NOT NULL DEFAULT false,
  "sourceTab" TEXT,
  "sourceType" "ZeronImportSourceType" NOT NULL,
  CONSTRAINT "ZeronDeliveryRow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ZeronDeliveryRow_sourceKey_key" ON "ZeronDeliveryRow"("sourceKey");
CREATE INDEX IF NOT EXISTS "ZeronDeliveryRow_itemCode_idx" ON "ZeronDeliveryRow"("itemCode");
CREATE INDEX IF NOT EXISTS "ZeronDeliveryRow_deliveryDate_idx" ON "ZeronDeliveryRow"("deliveryDate");
CREATE INDEX IF NOT EXISTS "ZeronDeliveryRow_processNumber_idx" ON "ZeronDeliveryRow"("processNumber");
CREATE INDEX IF NOT EXISTS "ZeronDeliveryRow_attachmentPresent_idx" ON "ZeronDeliveryRow"("attachmentPresent");
CREATE INDEX IF NOT EXISTS "ZeronDeliveryRow_importRunId_idx" ON "ZeronDeliveryRow"("importRunId");

-- FKs (skip if already present)
DO $$ BEGIN
  ALTER TABLE "ZeronImportRun"
    ADD CONSTRAINT "ZeronImportRun_triggeredById_fkey"
    FOREIGN KEY ("triggeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ZeronImportedTab"
    ADD CONSTRAINT "ZeronImportedTab_importRunId_fkey"
    FOREIGN KEY ("importRunId") REFERENCES "ZeronImportRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ZeronDeliveryRow"
    ADD CONSTRAINT "ZeronDeliveryRow_importRunId_fkey"
    FOREIGN KEY ("importRunId") REFERENCES "ZeronImportRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
