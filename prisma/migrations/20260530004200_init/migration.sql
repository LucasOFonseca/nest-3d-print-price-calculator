-- CreateTable
CREATE TABLE "filaments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "spoolWeight" DOUBLE PRECISION NOT NULL,
    "spoolPrice" DOUBLE PRECISION NOT NULL,
    "costPerGram" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "filaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packaging" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "packagePrice" DOUBLE PRECISION NOT NULL,
    "costPerUnit" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packaging_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "energy_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "kwhPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "printerConsumption" DOUBLE PRECISION NOT NULL DEFAULT 150,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "energy_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "printer_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "wearCostPerHour" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "printer_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labor_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "hourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labor_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profit_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "defaultProfitMargin" DOUBLE PRECISION NOT NULL DEFAULT 35,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profit_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filamentId" TEXT NOT NULL,
    "filamentName" TEXT NOT NULL,
    "materialUsed" DOUBLE PRECISION NOT NULL,
    "printTimeHours" INTEGER NOT NULL,
    "printTimeMinutes" INTEGER NOT NULL,
    "paintTimeHours" INTEGER NOT NULL DEFAULT 0,
    "paintTimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "assemblyTimeHours" INTEGER NOT NULL DEFAULT 0,
    "assemblyTimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "finishingTimeHours" INTEGER NOT NULL DEFAULT 0,
    "finishingTimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "includePostProcessing" BOOLEAN NOT NULL DEFAULT true,
    "packagingId" TEXT,
    "packagingName" TEXT,
    "includePackaging" BOOLEAN NOT NULL DEFAULT false,
    "useDefaultMargin" BOOLEAN NOT NULL DEFAULT true,
    "profitMargin" DOUBLE PRECISION NOT NULL,
    "filamentCost" DOUBLE PRECISION NOT NULL,
    "energyCost" DOUBLE PRECISION NOT NULL,
    "printerWear" DOUBLE PRECISION NOT NULL,
    "laborCost" DOUBLE PRECISION NOT NULL,
    "packagingCost" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "profit" DOUBLE PRECISION NOT NULL,
    "finalPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);
