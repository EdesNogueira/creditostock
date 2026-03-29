-- CreateEnum
CREATE TYPE "TaxRegime" AS ENUM ('UNKNOWN', 'NORMAL', 'ST');

-- CreateEnum
CREATE TYPE "CalculationKind" AS ENUM ('GENERAL_ICMS', 'ST_TRANSITION');

-- CreateEnum
CREATE TYPE "TransitionCalcMethod" AS ENUM ('PROPORTIONAL_ST_ONLY', 'PROPORTIONAL_ST_PLUS_FCP', 'MANUAL_OVERRIDE');

-- CreateEnum
CREATE TYPE "TransitionCreditStatus" AS ENUM ('OPEN', 'PARTIALLY_USED', 'FULLY_USED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('GENERATED', 'MANUAL_ADJUSTMENT', 'USED', 'BLOCKED', 'REVERSED');

-- AlterTable
ALTER TABLE "credit_calculations" ADD COLUMN     "executionVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "kind" "CalculationKind" NOT NULL DEFAULT 'GENERAL_ICMS',
ADD COLUMN     "totalFcpStCredit" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalIcmsStCredit" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalTransitionCreditAvailable" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalTransitionCreditBlocked" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalTransitionCreditGenerated" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "transitionReferenceDate" TIMESTAMP(3),
ADD COLUMN     "transitionRuleId" TEXT;

-- AlterTable
ALTER TABLE "nfe_documents" ADD COLUMN     "destState" TEXT,
ADD COLUMN     "emitState" TEXT,
ADD COLUMN     "importSource" TEXT,
ADD COLUMN     "operationNature" TEXT,
ADD COLUMN     "parserVersion" TEXT,
ADD COLUMN     "rawAdditionalInfo" TEXT,
ADD COLUMN     "rawProtocolNumber" TEXT,
ADD COLUMN     "xmlHash" TEXT;

-- AlterTable
ALTER TABLE "nfe_items" ADD COLUMN     "cest" TEXT,
ADD COLUMN     "extIpi" TEXT,
ADD COLUMN     "fcpStUnitAmount" DECIMAL(14,6) NOT NULL DEFAULT 0,
ADD COLUMN     "icmsStUnitAmount" DECIMAL(14,6) NOT NULL DEFAULT 0,
ADD COLUMN     "icmsUnitAmount" DECIMAL(14,6) NOT NULL DEFAULT 0,
ADD COLUMN     "modBC" TEXT,
ADD COLUMN     "modBCST" TEXT,
ADD COLUMN     "nItem" INTEGER,
ADD COLUMN     "orig" TEXT,
ADD COLUMN     "pFCPST" DECIMAL(8,4) NOT NULL DEFAULT 0,
ADD COLUMN     "pICMSST" DECIMAL(8,4) NOT NULL DEFAULT 0,
ADD COLUMN     "pMVAST" DECIMAL(8,4) NOT NULL DEFAULT 0,
ADD COLUMN     "rawTaxJson" JSONB,
ADD COLUMN     "stApplies" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "supplierOrderRef" TEXT,
ADD COLUMN     "taxRegime" "TaxRegime" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "vBC" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vBCFCPST" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vBCST" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vFCPST" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vICMSST" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "stock_origin_allocations" ADD COLUMN     "allocatedFcpSt" DECIMAL(14,4) NOT NULL DEFAULT 0,
ADD COLUMN     "allocatedIcmsSt" DECIMAL(14,4) NOT NULL DEFAULT 0,
ADD COLUMN     "allocatedRegularIcms" DECIMAL(14,4) NOT NULL DEFAULT 0,
ADD COLUMN     "calcNotes" TEXT,
ADD COLUMN     "sourceTaxRegime" "TaxRegime" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "taxTransitionRuleId" TEXT,
ADD COLUMN     "unitFcpSt" DECIMAL(14,6) NOT NULL DEFAULT 0,
ADD COLUMN     "unitIcmsSt" DECIMAL(14,6) NOT NULL DEFAULT 0,
ADD COLUMN     "unitRegularIcms" DECIMAL(14,6) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "stock_snapshots" ADD COLUMN     "fileHash" TEXT,
ADD COLUMN     "importSource" TEXT,
ADD COLUMN     "parserVersion" TEXT;

-- CreateTable
CREATE TABLE "tax_transition_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stateFrom" TEXT NOT NULL,
    "stateTo" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "ncmRange" TEXT,
    "cestList" TEXT,
    "cfopList" TEXT,
    "cstList" TEXT,
    "taxRegimeBefore" "TaxRegime" NOT NULL DEFAULT 'ST',
    "taxRegimeAfter" "TaxRegime" NOT NULL DEFAULT 'NORMAL',
    "calcMethod" "TransitionCalcMethod" NOT NULL DEFAULT 'PROPORTIONAL_ST_ONLY',
    "includeFcpStInCredit" BOOLEAN NOT NULL DEFAULT false,
    "requiresExistingStockSnapshot" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_transition_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transition_credit_lots" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "calculationId" TEXT,
    "snapshotId" TEXT NOT NULL,
    "stockSnapshotItemId" TEXT NOT NULL,
    "nfeItemId" TEXT NOT NULL,
    "taxTransitionRuleId" TEXT NOT NULL,
    "quantityInStock" DECIMAL(14,4) NOT NULL,
    "quantityAllocatedFromNfe" DECIMAL(14,4) NOT NULL,
    "unitIcmsSt" DECIMAL(14,6) NOT NULL,
    "unitFcpSt" DECIMAL(14,6) NOT NULL DEFAULT 0,
    "totalIcmsSt" DECIMAL(14,4) NOT NULL,
    "totalFcpSt" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "creditableAmount" DECIMAL(14,4) NOT NULL,
    "nonCreditableAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "status" "TransitionCreditStatus" NOT NULL DEFAULT 'OPEN',
    "rationale" TEXT,
    "executionVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transition_credit_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transition_credit_ledger_entries" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "transitionCreditLotId" TEXT NOT NULL,
    "entryType" "LedgerEntryType" NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "notes" TEXT,
    "executionVersion" INTEGER NOT NULL DEFAULT 1,
    "isAutoGenerated" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transition_credit_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tax_transition_rules_stateFrom_idx" ON "tax_transition_rules"("stateFrom");

-- CreateIndex
CREATE INDEX "tax_transition_rules_isActive_idx" ON "tax_transition_rules"("isActive");

-- CreateIndex
CREATE INDEX "transition_credit_lots_branchId_idx" ON "transition_credit_lots"("branchId");

-- CreateIndex
CREATE INDEX "transition_credit_lots_snapshotId_idx" ON "transition_credit_lots"("snapshotId");

-- CreateIndex
CREATE INDEX "transition_credit_lots_calculationId_idx" ON "transition_credit_lots"("calculationId");

-- CreateIndex
CREATE INDEX "transition_credit_lots_taxTransitionRuleId_idx" ON "transition_credit_lots"("taxTransitionRuleId");

-- CreateIndex
CREATE INDEX "transition_credit_lots_status_idx" ON "transition_credit_lots"("status");

-- CreateIndex
CREATE INDEX "transition_credit_ledger_entries_branchId_idx" ON "transition_credit_ledger_entries"("branchId");

-- CreateIndex
CREATE INDEX "transition_credit_ledger_entries_transitionCreditLotId_idx" ON "transition_credit_ledger_entries"("transitionCreditLotId");

-- CreateIndex
CREATE INDEX "transition_credit_ledger_entries_entryType_idx" ON "transition_credit_ledger_entries"("entryType");

-- CreateIndex
CREATE INDEX "credit_calculations_branchId_idx" ON "credit_calculations"("branchId");

-- CreateIndex
CREATE INDEX "credit_calculations_kind_idx" ON "credit_calculations"("kind");

-- CreateIndex
CREATE INDEX "credit_calculations_transitionRuleId_idx" ON "credit_calculations"("transitionRuleId");

-- CreateIndex
CREATE INDEX "nfe_documents_branchId_idx" ON "nfe_documents"("branchId");

-- CreateIndex
CREATE INDEX "nfe_documents_cnpjEmitente_idx" ON "nfe_documents"("cnpjEmitente");

-- CreateIndex
CREATE INDEX "nfe_documents_dataEmissao_idx" ON "nfe_documents"("dataEmissao");

-- CreateIndex
CREATE INDEX "nfe_items_cProd_idx" ON "nfe_items"("cProd");

-- CreateIndex
CREATE INDEX "nfe_items_ncm_idx" ON "nfe_items"("ncm");

-- CreateIndex
CREATE INDEX "nfe_items_cest_idx" ON "nfe_items"("cest");

-- CreateIndex
CREATE INDEX "nfe_items_cfop_idx" ON "nfe_items"("cfop");

-- CreateIndex
CREATE INDEX "nfe_items_cst_idx" ON "nfe_items"("cst");

-- CreateIndex
CREATE INDEX "nfe_items_nfeDocumentId_idx" ON "nfe_items"("nfeDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "nfe_items_nfeDocumentId_nItem_key" ON "nfe_items"("nfeDocumentId", "nItem");

-- CreateIndex
CREATE INDEX "products_sku_idx" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_ean_idx" ON "products"("ean");

-- CreateIndex
CREATE INDEX "products_ncm_idx" ON "products"("ncm");

-- CreateIndex
CREATE INDEX "stock_origin_allocations_stockSnapshotItemId_idx" ON "stock_origin_allocations"("stockSnapshotItemId");

-- CreateIndex
CREATE INDEX "stock_origin_allocations_nfeItemId_idx" ON "stock_origin_allocations"("nfeItemId");

-- CreateIndex
CREATE INDEX "stock_origin_allocations_taxTransitionRuleId_idx" ON "stock_origin_allocations"("taxTransitionRuleId");

-- CreateIndex
CREATE INDEX "stock_snapshot_items_snapshotId_idx" ON "stock_snapshot_items"("snapshotId");

-- CreateIndex
CREATE INDEX "stock_snapshot_items_rawSku_idx" ON "stock_snapshot_items"("rawSku");

-- CreateIndex
CREATE INDEX "stock_snapshots_branchId_idx" ON "stock_snapshots"("branchId");

-- AddForeignKey
ALTER TABLE "stock_origin_allocations" ADD CONSTRAINT "stock_origin_allocations_taxTransitionRuleId_fkey" FOREIGN KEY ("taxTransitionRuleId") REFERENCES "tax_transition_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transition_credit_lots" ADD CONSTRAINT "transition_credit_lots_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transition_credit_lots" ADD CONSTRAINT "transition_credit_lots_calculationId_fkey" FOREIGN KEY ("calculationId") REFERENCES "credit_calculations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transition_credit_lots" ADD CONSTRAINT "transition_credit_lots_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "stock_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transition_credit_lots" ADD CONSTRAINT "transition_credit_lots_stockSnapshotItemId_fkey" FOREIGN KEY ("stockSnapshotItemId") REFERENCES "stock_snapshot_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transition_credit_lots" ADD CONSTRAINT "transition_credit_lots_nfeItemId_fkey" FOREIGN KEY ("nfeItemId") REFERENCES "nfe_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transition_credit_lots" ADD CONSTRAINT "transition_credit_lots_taxTransitionRuleId_fkey" FOREIGN KEY ("taxTransitionRuleId") REFERENCES "tax_transition_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transition_credit_ledger_entries" ADD CONSTRAINT "transition_credit_ledger_entries_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transition_credit_ledger_entries" ADD CONSTRAINT "transition_credit_ledger_entries_transitionCreditLotId_fkey" FOREIGN KEY ("transitionCreditLotId") REFERENCES "transition_credit_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_calculations" ADD CONSTRAINT "credit_calculations_transitionRuleId_fkey" FOREIGN KEY ("transitionRuleId") REFERENCES "tax_transition_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
