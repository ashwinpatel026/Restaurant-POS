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
    
    // Check if we have errors and should scroll
    const hasErrors = Object.keys(formik.errors).length > 0;
    
    if ((submissionJustCompleted || submitCountIncreased) && hasErrors) {
      const firstErrorField = Object.keys(formik.errors)[0];
      const ref = fieldRefs[firstErrorField];

      if (ref?.current) {
        // Reset scroll flag for new error
        hasScrolledRef.current = true;
        
        // Use requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
          if (ref?.current) {
            ref.current.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
            setTimeout(() => {
              // Focus the field after scroll completes
              if (ref?.current) {
                (ref.current as HTMLElement).focus();
                // For input elements, also select the text if applicable
                if (ref.current instanceof HTMLInputElement) {
                  ref.current.select();
                }
              }
            }, 400);
          }
        });
      }
    }
    
    // Reset scroll flag when errors are cleared
    if (!hasErrors) {
      hasScrolledRef.current = false;
    }
    
    prevIsSubmittingRef.current = formik.isSubmitting;
  }, [formik.submitCount, formik.errors, formik.isSubmitting, fieldRefs]);
};
