import * as Yup from "yup";

export const menuItemSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required("Item Name is required")
    .max(30, "Item Name must be 30 characters or less"),

  labelName: Yup.string()
    .trim()
    .required("Label Name is required")
    .max(30, "Label Name must be 30 characters or less"),

  kitchenName: Yup.string()
    .max(30, "Kitchen Name must be 30 characters or less"),

  colorCode: Yup.string().required("Color code is required"),

  forColorCode: Yup.string().required("Text color is required"),

  menuMasterCode: Yup.string().required("Menu Master is required"),

  menuCategoryCode: Yup.mixed<string | string[]>()
    .nullable()
    .test('menuCategoryCode', 'Please select at least one category', function(value) {
      // If it's an array, check if it has at least one item
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      // If it's a string, check if it's not empty
      if (typeof value === 'string') {
        return value.length > 0;
      }
      // Allow null/undefined (will be checked manually in form)
      return true;
    }),

  // Other optional fields
  calories: Yup.string(),
  description: Yup.string(),
  itemSize: Yup.string(),
  skuPlu: Yup.string(),
  barcode: Yup.string(),
  itemContainAlcohol: Yup.number(),
  menuImg: Yup.string(),
  priceStrategy: Yup.number(),
  basePrice: Yup.number(),
  retailPrice: Yup.number()
    .nullable()
    .when(['isPrice', 'priceStrategy'], {
      is: (isPrice: number, priceStrategy: number) => isPrice === 1 && priceStrategy === 1,
      then: (schema) => schema
        .required("Retail Price is required when Pricing is enabled and Base Price is selected")
        .test('positive', 'Retail Price must be greater than 0', (value) => {
          return value !== null && value !== undefined && value > 0;
        }),
      otherwise: (schema) => schema.nullable(),
    }),
  isPrice: Yup.number(),
  deptCode: Yup.string(),
  isActive: Yup.number(),
  stockinhand: Yup.string(),
  taxCode: Yup.string(),
  inheritTaxInclusion: Yup.boolean(),
  isTaxIncluded: Yup.boolean(),
  inheritDiningTax: Yup.boolean(),
  diningTaxEffect: Yup.string(),
  disqualifyDiningTaxExemption: Yup.boolean(),
  isOutStock: Yup.number(),
  isPosVisible: Yup.number(),
  isKioskOrderPay: Yup.number(),
  isOnlineOrderByApp: Yup.number(),
  isOnlineOrdering: Yup.number(),
  isCustomerInvoice: Yup.number(),
  dimension: Yup.string(),
  weight: Yup.string(),
  prepTimeMinutes: Yup.number(),
});
