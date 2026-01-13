import * as Yup from "yup";

export const menuMasterSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required("Menu Name is required")
    .max(30, "Menu Name must be 30 characters or less"),

  labelName: Yup.string()
    .trim()
    .required("Label Name is required")
    .max(30, "Label Name must be 30 characters or less"),

  colorCode: Yup.string().required("Color code is required"),

  forColorCode: Yup.string().required("Text color is required"),

  deptCode: Yup.string(),
  eventCode: Yup.string(),
  isEventMenu: Yup.number(),
  isActive: Yup.number(),
});
