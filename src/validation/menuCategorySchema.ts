import * as Yup from "yup";

export const menuCategorySchema = Yup.object({
  name: Yup.string()
    .trim()
    .required("Category Name is required")
    .max(30, "Category Name must be 30 characters or less"),

  colorCode: Yup.string().required("Color code is required"),

  forColorCode: Yup.string().required("Text color is required"),

  menuMasterId: Yup.string().required("Menu Master is required"),
  deptCode: Yup.string(),
  isActive: Yup.number(),
});
