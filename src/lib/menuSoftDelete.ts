import { prisma } from '@/lib/database'

type SoftDeleteMeta = {
  updatedBy: number
  syncSource?: string
}

/**
 * Soft-delete menu items that reference any of the given category codes.
 * menu_category_code is JSON (string, string[], or structured {menuCategoryCode} objects).
 */
export async function softDeleteMenuItemsByCategoryCodes(
  categoryCodes: string[],
  meta: SoftDeleteMeta
): Promise<void> {
  if (categoryCodes.length === 0) return

  const syncSource = meta.syncSource || 'location'

  await prisma.$executeRaw`
    UPDATE tbl_menu_item
    SET
      is_active = 0,
      is_delete = true,
      updatedby = ${meta.updatedBy},
      updatedon = NOW(),
      sync_source = ${syncSource}
    WHERE is_delete = false
      AND menu_category_code IS NOT NULL
      AND (
        menu_category_code::text = ANY(
          SELECT to_jsonb(c)::text FROM unnest(${categoryCodes}::text[]) AS c
        )
        OR menu_category_code::text = ANY(${categoryCodes}::text[])
        OR (
          jsonb_typeof(menu_category_code::jsonb) = 'array'
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(menu_category_code::jsonb) AS elem
            WHERE
              elem #>> '{}' = ANY(${categoryCodes}::text[])
              OR elem->>'menuCategoryCode' = ANY(${categoryCodes}::text[])
          )
        )
      )
  `
}

/**
 * Soft-delete all categories under a menu master, then their menu items.
 */
export async function softDeleteCategoriesAndItemsByMasterCode(
  menuMasterCode: string,
  meta: SoftDeleteMeta
): Promise<void> {
  const syncSource = meta.syncSource || 'location'

  const categories = await prisma.menuCategory.findMany({
    where: {
      menuMasterCode,
      isDelete: false,
    },
    select: { menuCategoryCode: true },
  })

  const categoryCodes = categories.map((c) => c.menuCategoryCode)

  await prisma.menuCategory.updateMany({
    where: {
      menuMasterCode,
      isDelete: false,
    },
    data: {
      isActive: 0,
      isDelete: true,
      updatedBy: meta.updatedBy,
      updatedOn: new Date(),
      syncSource,
    },
  })

  await softDeleteMenuItemsByCategoryCodes(categoryCodes, meta)

  // Also soft-delete items that reference this master code directly
  await prisma.$executeRaw`
    UPDATE tbl_menu_item
    SET
      is_active = 0,
      is_delete = true,
      updatedby = ${meta.updatedBy},
      updatedon = NOW(),
      sync_source = ${syncSource}
    WHERE is_delete = false
      AND menu_master_code IS NOT NULL
      AND (
        menu_master_code::text = ${JSON.stringify(menuMasterCode)}
        OR menu_master_code::text = ${menuMasterCode}
        OR (
          jsonb_typeof(menu_master_code::jsonb) = 'array'
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(menu_master_code::jsonb) AS elem
            WHERE elem = ${menuMasterCode}
          )
        )
      )
  `
}

/**
 * Soft-delete a single category and all menu items assigned to it.
 */
export async function softDeleteCategoryAndItems(
  menuCategoryCode: string,
  meta: SoftDeleteMeta
): Promise<void> {
  const syncSource = meta.syncSource || 'location'

  await prisma.menuCategory.updateMany({
    where: {
      menuCategoryCode,
      isDelete: false,
    },
    data: {
      isActive: 0,
      isDelete: true,
      updatedBy: meta.updatedBy,
      updatedOn: new Date(),
      syncSource,
    },
  })

  await softDeleteMenuItemsByCategoryCodes([menuCategoryCode], meta)
}
