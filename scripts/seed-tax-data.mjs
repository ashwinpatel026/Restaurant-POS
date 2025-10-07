import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTaxData() {
  try {
    console.log('🌱 Starting tax data seeding...');

    // Clear existing tax data
    await prisma.tax.deleteMany({});
    console.log('🗑️  Cleared existing tax data');

    // Insert sample tax data
    const taxes = [
      {
        tblTaxId: 1,
        taxname: 'Liquor Tax',
        taxrate: 9.00,
        isSyncSqlserver: 0,
        storeCode: null
      },
      {
        tblTaxId: 2,
        taxname: 'Sales Tax',
        taxrate: 6.00,
        isSyncSqlserver: 0,
        storeCode: null
      },
      {
        tblTaxId: 3,
        taxname: 'Food Tax',
        taxrate: 4.00,
        isSyncSqlserver: 0,
        storeCode: null
      },
      {
        tblTaxId: 4,
        taxname: 'No Tax',
        taxrate: 0.00,
        isSyncSqlserver: 0,
        storeCode: null
      }
    ];

    for (const tax of taxes) {
      await prisma.tax.create({
        data: tax
      });
    }

    console.log('✅ Tax data seeded successfully!');
    console.log(`📊 Created ${taxes.length} tax records:`);
    taxes.forEach(tax => {
      console.log(`   - ${tax.taxname}: ${tax.taxrate}%`);
    });

  } catch (error) {
    console.error('❌ Error seeding tax data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
seedTaxData()
  .then(() => {
    console.log('🎉 Tax seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Tax seeding failed:', error);
    process.exit(1);
  });
