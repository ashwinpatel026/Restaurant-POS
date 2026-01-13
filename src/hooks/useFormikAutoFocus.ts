import { useEffect, useRef } from "react";

export const useFormikAutoFocus = (
  formik: any,
  fieldRefs: Record<string, React.RefObject<HTMLElement>>
) => {
  const prevIsSubmittingRef = useRef(formik.isSubmitting);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    // Detect when form submission attempt completes (isSubmitting goes from true to false)
    const submissionJustCompleted = prevIsSubmittingRef.current === true && formik.isSubmitting === false;
    
    // Also check if submitCount increased (for successful validation that still has errors somehow)
    const submitCountIncreased = formik.submitCount > 0;
    
    if ((submissionJustCompleted || submitCountIncreased) && Object.keys(formik.errors).length > 0 && !hasScrolledRef.current) {
      const firstErrorField = Object.keys(formik.errors)[0];
      const ref = fieldRefs[firstErrorField];

      if (ref?.current) {
        hasScrolledRef.current = true;
        ref.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        setTimeout(() => {
          ref.current?.focus();
        }, 300);
      }
    }
    
    // Reset scroll flag when errors are cleared
    if (Object.keys(formik.errors).length === 0) {
      hasScrolledRef.current = false;
    }
    
    prevIsSubmittingRef.current = formik.isSubmitting;
  }, [formik.submitCount, formik.errors, formik.isSubmitting, fieldRefs]);
};
