import { useEffect, useState } from "react";
import { Dna } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { isAccountType, routeForAccountType } from "../lib/authRouting";
import { syncPendingAssessment } from "../lib/familyAssessment";

function getHashParams() {
  return new URLSearchParams(window.location.hash.replace(/^#/, ""));
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("Finishing secure sign in…");

  useEffect(() => {
    let active = true;

    const finish = async () => {
      try {
        /*
         * Supabase can return from email/OAuth authentication in more than one
         * format depending on the auth flow and email template in use:
         *   1) ?code=...                       (PKCE / OAuth code flow)
         *   2) ?token_hash=...&type=...       (email OTP confirmation flow)
         *   3) #access_token=...&refresh_token=... (implicit flow)
         * Handle all three before deciding that confirmation failed.
         */
        const code = searchParams.get("code");
        const tokenHash = searchParams.get("token_hash");
        const emailType = searchParams.get("type");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          // It is possible that supabase-js already exchanged the same code.
          // Only throw when there still isn't a usable session below.
          if (error) console.warn("Auth code exchange:", error.message);
        }

        if (tokenHash && emailType) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: emailType as any,
          });
          if (error) console.warn("Email verification exchange:", error.message);
        }

        const hash = getHashParams();
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          // Remove secrets from the address bar after they have been consumed.
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        }

        let session = (await supabase.auth.getSession()).data.session;
        for (let attempt = 0; !session?.user && attempt < 15; attempt += 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 150));
          session = (await supabase.auth.getSession()).data.session;
        }

        if (!session?.user) {
          setMessage(
            "This verification link could not establish a secure session. The link may be old or already used. Return to Log In; if necessary, request a new verification or password-recovery link.",
          );
          return;
        }

        const user = session.user;
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("account_type, created_at")
          .eq("id", user.id)
          .single();
        if (profileError) throw profileError;

        const intent = localStorage.getItem("dmd_ai_oauth_intent");
        const roleFromLink = searchParams.get("role");
        const desiredIntent = intent ?? roleFromLink;
        const desired =
          desiredIntent === "hospital"
            ? "hospital_applicant"
            : desiredIntent === "family"
              ? "family"
              : null;
        let accountType = profile?.account_type;

        // A newly-created OAuth account may need the selected signup role.
        // Never overwrite the role of an established DMD-AI account.
        const createdAt = new Date(user.created_at).getTime();
        const isNew = Number.isFinite(createdAt) && Date.now() - createdAt < 10 * 60 * 1000;
        if (desired && isNew && accountType !== desired) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ account_type: desired })
            .eq("id", user.id);
          if (updateError) throw updateError;
          accountType = desired;
        }

        localStorage.removeItem("dmd_ai_oauth_intent");
        localStorage.removeItem("dmd_ai_after_confirmation");

        if (!isAccountType(accountType)) {
          throw new Error("DMD-AI could not determine your portal type.");
        }

        if (accountType === "family") {
          await syncPendingAssessment();
        }

        if (active) navigate(routeForAccountType(accountType), { replace: true });
      } catch (error) {
        console.error("Authentication callback error:", error);
        if (active) {
          setMessage(
            error instanceof Error
              ? error.message
              : "DMD-AI could not finish the secure authentication session.",
          );
        }
      }
    };

    void finish();
    return () => {
      active = false;
    };
  }, [navigate, searchParams]);

  return (
    <main className="oauth-callback-page">
      <div className="oauth-callback-card">
        <div className="auth-logo-icon"><Dna size={34} /></div>
        <h1>DMD-AI</h1>
        <p>{message}</p>
        {message !== "Finishing secure sign in…" && (
          <button className="auth-submit-button" onClick={() => navigate("/login")}>
            Return to Log In
          </button>
        )}
      </div>
    </main>
  );
}
