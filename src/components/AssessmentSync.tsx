import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { syncPendingAssessment } from "../lib/familyAssessment";

export default function AssessmentSync() {
  useEffect(() => {
    void syncPendingAssessment().catch((error) => console.error("Assessment sync failed:", error));
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        window.setTimeout(() => void syncPendingAssessment().catch((error) => console.error("Assessment sync failed:", error)), 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return null;
}
