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

  menuCategoryCode: Yup.string().nullable(),

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
  retailPrice: Yup.number(),
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
