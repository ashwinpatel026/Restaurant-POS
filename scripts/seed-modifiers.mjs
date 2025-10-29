import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedModifiers() {
  console.log('🌱 Seeding modifier system...');

  try {
    // 1. Create Menu Categories
    console.log('Creating menu categories...');
    
    const foodCategory = await prisma.menuCategory.upsert({
      where: { tblMenuCategoryId: 1 },
      update: {},
      create: {
        tblMenuCategoryId: 1,
        tblMenuMasterId: 1,
        name: 'FOOD',
        colorCode: '#3B82F6',
        isActive: 1,
        createdBy: 1,
        storeCode: 'MAIN'
      }
    });

    const sandwichesCategory = await prisma.menuCategory.upsert({
      where: { tblMenuCategoryId: 2 },
      update: {},
      create: {
        tblMenuCategoryId: 2,
        tblMenuMasterId: 1,
        name: 'Sandwiches, Subs & Wraps',
        colorCode: '#10B981',
        isActive: 1,
        createdBy: 1,
        storeCode: 'MAIN'
      }
    });

    const nachosCategory = await prisma.menuCategory.upsert({
      where: { tblMenuCategoryId: 3 },
      update: {},
      create: {
        tblMenuCategoryId: 3,
        tblMenuMasterId: 1,
        name: 'Nachos',
        colorCode: '#F59E0B',
        isActive: 1,
        createdBy: 1,
        storeCode: 'MAIN'
      }
    });

    // 2. Create Item-Level Modifier Groups
    console.log('Creating item-level modifier groups...');

    const burgerTempMod = await prisma.modifier.upsert({
      where: { tblModifierId: 1 },
      update: {},
      create: {
        tblModifierId: 1,
        name: 'Burger Temp Mod',
        labelName: 'Burger Temperature',
        posName: 'Burger Temp Mod',
        colorCode: '#EF4444',
        priceStrategy: 1,
        required: 1,
        isMultiselect: 0,
        minSelection: null,
        maxSelection: null,
        additionalChargeType: 'price_set_on_individual_modifiers',
        createdBy: 1,
        storeCode: 'MAIN'
      }
    });

    const cheeseChoice = await prisma.modifier.upsert({
      where: { tblModifierId: 2 },
      update: {},
      create: {
        tblModifierId: 2,
        name: 'Cheese Choice',
        labelName: 'Cheese Selection',
        posName: 'Cheese Choice',
        colorCode: '#F59E0B',
        priceStrategy: 1,
        required: 0,
        isMultiselect: 0,
        minSelection: null,
        maxSelection: null,
        additionalChargeType: 'price_set_on_individual_modifiers',
        createdBy: 1,
        storeCode: 'MAIN'
      }
    });

    const toppings = await prisma.modifier.upsert({
      where: { tblModifierId: 3 },
      update: {},
      create: {
        tblModifierId: 3,
        name: 'Toppings',
        labelName: 'Burger Toppings',
        posName: 'Toppings',
        colorCode: '#10B981',
        priceStrategy: 1,
        required: 0,
        isMultiselect: 1,
        minSelection: null,
        maxSelection: null,
        additionalChargeType: 'price_set_on_individual_modifiers',
        createdBy: 1,
        storeCode: 'MAIN'
      }
    });

    // 3. Create Category-Level Modifier Groups
    console.log('Creating category-level modifier groups...');

    const sandwichesNoOption = await prisma.modifier.upsert({
      where: { tblModifierId: 4 },
      update: {},
      create: {
        tblModifierId: 4,
        tblMenuCategoryId: 2, // Sandwiches category
        name: 'Sandwiches No Option',
        labelName: 'Sandwich Exclusions',
        posName: 'No LTM',
        colorCode: '#6B7280',
        priceStrategy: 1,
        required: 0,
        isMultiselect: 0,
        minSelection: null,
        maxSelection: null,
        additionalChargeType: 'price_set_on_individual_modifiers',
        createdBy: 1,
        storeCode: 'MAIN'
      }
    });

    const side = await prisma.modifier.upsert({
      where: { tblModifierId: 5 },
      update: {},
      create: {
        tblModifierId: 5,
        tblMenuCategoryId: 2, // Sandwiches category
        name: 'Side',
        labelName: 'Side Dish',
        posName: 'Side',
        colorCode: '#8B5CF6',
        priceStrategy: 1,
        required: 0,
        isMultiselect: 0,
        minSelection: null,
        maxSelection: null,
        additionalChargeType: 'price_set_on_individual_modifiers',
        createdBy: 1,
        storeCode: 'MAIN'
      }
    });

    const breadChoice = await prisma.modifier.upsert({
      where: { tblModifierId: 6 },
      update: {},
      create: {
        tblModifierId: 6,
        tblMenuCategoryId: 2, // Sandwiches category
        name: 'Bread Choice',
        labelName: 'Bread Selection',
        posName: 'Bread Choice',
        colorCode: '#F97316',
        priceStrategy: 1,
        required: 0,
        isMultiselect: 0,
        minSelection: null,
        maxSelection: null,
        additionalChargeType: 'price_set_on_individual_modifiers',
        createdBy: 1,
        storeCode: 'MAIN'
      }
    });

    const nachosToppings = await prisma.modifier.upsert({
      where: { tblModifierId: 7 },
      update: {},
      create: {
        tblModifierId: 7,
        tblMenuCategoryId: 3, // Nachos category
        name: 'Nachos Toppings',
        labelName: 'Nacho Toppings',
        posName: 'Nachos Toppings',
        colorCode: '#EC4899',
        priceStrategy: 1,
        required: 0,
        isMultiselect: 1,
        minSelection: null,
        maxSelection: null,
        additionalChargeType: 'price_set_on_individual_modifiers',
        createdBy: 1,
        storeCode: 'MAIN'
      }
    });

    // 4. Create Modifier Items
    console.log('Creating modifier items...');

    // Burger Temp Mod items
    const burgerTempItems = [
      { name: 'Rare', price: 0.00 },
      { name: 'Medium-Rare', price: 0.00 },
      { name: 'Medium', price: 0.00 },
      { name: 'Medium-Well', price: 0.00 },
      { name: 'Well-Done', price: 0.00 }
    ];

    for (let i = 0; i < burgerTempItems.length; i++) {
      await prisma.modifierItem.upsert({
        where: { tblModifierItemId: i + 1 },
        update: {},
        create: {
          tblModifierItemId: i + 1,
          tblModifierId: 1,
          name: burgerTempItems[i].name,
          labelName: burgerTempItems[i].name,
          posName: burgerTempItems[i].name,
          price: burgerTempItems[i].price,
          isActive: 1,
          storeCode: 'MAIN'
        }
      });
    }

    // Cheese Choice items
    const cheeseItems = [
      { name: 'Cheddar', price: 1.50 },
      { name: 'Swiss', price: 1.50 },
      { name: 'Provolone', price: 1.50 },
      { name: 'American', price: 1.00 },
      { name: 'Vegan Cheese', price: 2.00 }
    ];

    for (let i = 0; i < cheeseItems.length; i++) {
      await prisma.modifierItem.upsert({
        where: { tblModifierItemId: i + 6 },
        update: {},
        create: {
          tblModifierItemId: i + 6,
          tblModifierId: 2,
          name: cheeseItems[i].name,
          labelName: cheeseItems[i].name,
          posName: cheeseItems[i].name,
          price: cheeseItems[i].price,
          isActive: 1,
          storeCode: 'MAIN'
        }
      });
    }

    // Toppings items
    const toppingItems = [
      { name: 'Lettuce', price: 0.00 },
      { name: 'Tomato', price: 0.00 },
      { name: 'Onion', price: 0.00 },
      { name: 'Bacon', price: 2.50 },
      { name: 'Avocado', price: 2.00 },
      { name: 'Pickles', price: 0.00 },
      { name: 'Mushrooms', price: 1.50 }
    ];

    for (let i = 0; i < toppingItems.length; i++) {
      await prisma.modifierItem.upsert({
        where: { tblModifierItemId: i + 11 },
        update: {},
        create: {
          tblModifierItemId: i + 11,
          tblModifierId: 3,
          name: toppingItems[i].name,
          labelName: toppingItems[i].name,
          posName: toppingItems[i].name,
          price: toppingItems[i].price,
          isActive: 1,
          storeCode: 'MAIN'
        }
      });
    }

    // Sandwiches No Option items
    const noOptionItems = [
      { name: 'No Lettuce', price: 0.00 },
      { name: 'No Tomato', price: 0.00 },
      { name: 'No Mayo', price: 0.00 }
    ];

    for (let i = 0; i < noOptionItems.length; i++) {
      await prisma.modifierItem.upsert({
        where: { tblModifierItemId: i + 18 },
        update: {},
        create: {
          tblModifierItemId: i + 18,
          tblModifierId: 4,
          name: noOptionItems[i].name,
          labelName: noOptionItems[i].name,
          posName: noOptionItems[i].name,
          price: noOptionItems[i].price,
          isActive: 1,
          storeCode: 'MAIN'
        }
      });
    }

    // Side items
    const sideItems = [
      { name: 'Fries', price: 0.00 },
      { name: 'Salad', price: 0.00 },
      { name: 'Onion Rings', price: 1.50 },
      { name: 'Sweet Potato Fries', price: 2.00 },
      { name: 'Coleslaw', price: 0.00 }
    ];

    for (let i = 0; i < sideItems.length; i++) {
      await prisma.modifierItem.upsert({
        where: { tblModifierItemId: i + 21 },
        update: {},
        create: {
          tblModifierItemId: i + 21,
          tblModifierId: 5,
          name: sideItems[i].name,
          labelName: sideItems[i].name,
          posName: sideItems[i].name,
          price: sideItems[i].price,
          isActive: 1,
          storeCode: 'MAIN'
        }
      });
    }

    // Bread Choice items
    const breadItems = [
      { name: 'Brioche Bun', price: 0.00 },
      { name: 'Sesame Bun', price: 0.00 },
      { name: 'Whole Wheat', price: 0.00 },
      { name: 'Gluten-Free', price: 1.00 }
    ];

    for (let i = 0; i < breadItems.length; i++) {
      await prisma.modifierItem.upsert({
        where: { tblModifierItemId: i + 26 },
        update: {},
        create: {
          tblModifierItemId: i + 26,
          tblModifierId: 6,
          name: breadItems[i].name,
          labelName: breadItems[i].name,
          posName: breadItems[i].name,
          price: breadItems[i].price,
          isActive: 1,
          storeCode: 'MAIN'
        }
      });
    }

    // Nachos Toppings items
    const nachoToppingItems = [
      { name: 'No Lettuce', price: 0.00 },
      { name: 'No Pico de Gallo', price: 0.00 },
      { name: 'Extra Cheese', price: 1.50 },
      { name: 'Extra Jalapeños', price: 0.50 }
    ];

    for (let i = 0; i < nachoToppingItems.length; i++) {
      await prisma.modifierItem.upsert({
        where: { tblModifierItemId: i + 30 },
        update: {},
        create: {
          tblModifierItemId: i + 30,
          tblModifierId: 7,
          name: nachoToppingItems[i].name,
          labelName: nachoToppingItems[i].name,
          posName: nachoToppingItems[i].name,
          price: nachoToppingItems[i].price,
          isActive: 1,
          storeCode: 'MAIN'
        }
      });
    }

    // 5. Create Sample Menu Items
    console.log('Creating sample menu items...');

    const angusBurger = await prisma.menuItem.upsert({
      where: { tblMenuItemId: 1 },
      update: {},
      create: {
        tblMenuItemId: 1,
        tblMenuCategoryId: 2,
        name: 'Angus Burger',
        labelName: 'Angus Burger',
        colorCode: '#EF4444',
        calories: '650',
        descrip: 'Juicy angus beef patty with fresh ingredients',
        skuPlu: 1001,
        isAlcohol: 0,
        priceStrategy: 1,
        price: 12.99,
        inheritModifiers: 1,
        isActive: 1,
        createdBy: 1,
        storeCode: 'MAIN'
      }
    });

    const classicNachos = await prisma.menuItem.upsert({
      where: { tblMenuItemId: 2 },
      update: {},
      create: {
        tblMenuItemId: 2,
        tblMenuCategoryId: 3,
        name: 'Classic Nachos',
        labelName: 'Classic Nachos',
        colorCode: '#F59E0B',
        calories: '450',
        descrip: 'Crispy tortilla chips with cheese and toppings',
        skuPlu: 2001,
        isAlcohol: 0,
        priceStrategy: 1,
        price: 8.99,
        inheritModifiers: 1,
        isActive: 1,
        createdBy: 1,
        storeCode: 'MAIN'
      }
    });

    // 6. Create Menu Item Modifier Assignments
    console.log('Creating menu item modifier assignments...');

    // Angus Burger - Item-level modifiers
    const angusBurgerModifiers = [
      { modifierId: 1, isInherited: 0 }, // Burger Temp Mod
      { modifierId: 2, isInherited: 0 }, // Cheese Choice
      { modifierId: 3, isInherited: 0 }  // Toppings
    ];

    for (let i = 0; i < angusBurgerModifiers.length; i++) {
      await prisma.menuItemModifier.upsert({
        where: { menuItemModifierId: i + 1 },
        update: {},
        create: {
          menuItemModifierId: i + 1,
          tblMenuItemId: 1,
          tblModifierId: angusBurgerModifiers[i].modifierId,
          isInherited: angusBurgerModifiers[i].isInherited,
          additionalChargeType: 'price_set_on_individual_modifiers',
          storeCode: 'MAIN'
        }
      });
    }

    // Angus Burger - Inherited modifiers (from Sandwiches category)
    const angusBurgerInherited = [
      { modifierId: 4, isInherited: 1 }, // Sandwiches No Option
      { modifierId: 5, isInherited: 1 }, // Side
      { modifierId: 6, isInherited: 1 }  // Bread Choice
    ];

    for (let i = 0; i < angusBurgerInherited.length; i++) {
      await prisma.menuItemModifier.upsert({
        where: { menuItemModifierId: i + 4 },
        update: {},
        create: {
          menuItemModifierId: i + 4,
          tblMenuItemId: 1,
          tblModifierId: angusBurgerInherited[i].modifierId,
          isInherited: angusBurgerInherited[i].isInherited,
          additionalChargeType: 'price_set_on_individual_modifiers',
          storeCode: 'MAIN'
        }
      });
    }

    // Classic Nachos - Inherited modifiers (from Nachos category)
    await prisma.menuItemModifier.upsert({
      where: { menuItemModifierId: 7 },
      update: {},
      create: {
        menuItemModifierId: 7,
        tblMenuItemId: 2,
        tblModifierId: 7, // Nachos Toppings
        isInherited: 1,
        additionalChargeType: 'price_set_on_individual_modifiers',
        storeCode: 'MAIN'
      }
    });

    console.log('✅ Modifier system seeded successfully!');
    console.log('\n📊 Summary:');
    console.log('- 3 Menu Categories created');
    console.log('- 7 Modifier Groups created (3 item-level, 4 category-level)');
    console.log('- 34 Modifier Items created');
    console.log('- 2 Sample Menu Items created');
    console.log('- 7 Menu Item Modifier assignments created');
    console.log('\n🎯 Test Scenarios:');
    console.log('1. Angus Burger: Has item-level modifiers (Burger Temp, Cheese, Toppings) + inherited (No Option, Side, Bread)');
    console.log('2. Classic Nachos: Has inherited modifiers (Nachos Toppings)');
    console.log('3. Create new sandwich items to test inheritance from Sandwiches category');
    console.log('4. Create new nacho items to test inheritance from Nachos category');

  } catch (error) {
    console.error('❌ Error seeding modifiers:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedModifiers()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
