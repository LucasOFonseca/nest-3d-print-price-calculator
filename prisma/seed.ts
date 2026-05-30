import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Upsert singleton configs (safe to run multiple times)
  await prisma.energyConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton', kwhPrice: 0.85, printerConsumption: 150 },
  });
  await prisma.printerConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton', wearCostPerHour: 1.50 },
  });
  await prisma.laborConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton', hourlyRate: 30.00 },
  });
  await prisma.profitConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton', defaultProfitMargin: 35 },
  });

  // Seed default filaments only if table is empty
  const filamentCount = await prisma.filament.count();
  if (filamentCount === 0) {
    await prisma.filament.createMany({
      data: [
        { name: 'PLA Branco', spoolWeight: 1000, spoolPrice: 89.90, costPerGram: 0.0899 },
        { name: 'PLA Preto',  spoolWeight: 1000, spoolPrice: 89.90, costPerGram: 0.0899 },
        { name: 'PETG Azul',  spoolWeight: 1000, spoolPrice: 119.90, costPerGram: 0.1199 },
      ],
    });
  }

  // Seed default packaging only if table is empty
  const packagingCount = await prisma.packaging.count();
  if (packagingCount === 0) {
    await prisma.packaging.createMany({
      data: [
        { name: 'Caixa de Papelão Padrão', quantity: 10, packagePrice: 35.00, costPerUnit: 3.50 },
        { name: 'Saco Bolha Grande',       quantity: 50, packagePrice: 45.00, costPerUnit: 0.90 },
      ],
    });
  }

  console.log('Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
