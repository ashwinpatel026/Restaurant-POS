export function menu_master_validate(values: any) {
  const errors: any = {};

  // Menu Master Name validation
  if (!values.name || !values.name.trim()) {
    errors.name = "Menu Name is required";
  } else if (values.name.trim().length > 30) {
    errors.name = "Menu Name must be 30 characters or less";
  }

  // Label Name validation
  if (!values.labelName || !values.labelName.trim()) {
    errors.labelName = "Label Name is required";
  } else if (values.labelName.trim().length > 30) {
    errors.labelName = "Label Name must be 30 characters or less";
  }

  // Color Code validation
  if (!values.colorCode || !values.colorCode.trim()) {
    errors.colorCode = "Color code is required";
  }

  // Text Color validation
  if (!values.forColorCode || !values.forColorCode.trim()) {
    errors.forColorCode = "Text color is required";
  }

  return errors;
}
