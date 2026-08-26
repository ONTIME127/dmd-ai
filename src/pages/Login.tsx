import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import {
  ArrowLeft,
  Dna,
  Eye,
  EyeOff,
  Heart,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Stethoscope,
  } from "lucide-react";

import { useNavigate, useSearchParams } from "react-router-dom";

import { supabase, supabasePublishableKey, supabaseUrl } from "../lib/supabase";
import { isAccountType, routeForAccountType } from "../lib/authRouting";
import { syncPendingAssessment } from "../lib/familyAssessment";

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailConfirmed = searchParams.get("confirmed") === "1";
  const passwordReset = searchParams.get("password_reset") === "1";
  const [recoverySent, setRecoverySent] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] =
    useState(false);

  const [currentSession, setCurrentSession] = useState<{
    email: string;
    accountType: string;
    destination: string;
  } | null>(null);

  // A normal visit to /login always shows the login interface.
  // If someone is already signed in, offer a clear choice instead of
  // silently redirecting them away from Login.
  useEffect(() => {
    let active = true;

    const detectExistingSession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!active || sessionError || !session?.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!active || !isAccountType(profile?.account_type)) return;

      setCurrentSession({
        email: session.user.email ?? "Current account",
        accountType: profile.account_type,
        destination: routeForAccountType(profile.account_type),
      });
    };

    void detectExistingSession();
    return () => { active = false; };
  }, []);

  const handleUseAnotherAccount = async () => {
    setError("");
    setLoading(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      if (signOutError) throw signOutError;
      localStorage.removeItem("dmd_ai_after_confirmation");
      localStorage.removeItem("dmd_ai_oauth_intent");
      setCurrentSession(null);
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to switch accounts.");
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    if (!email.trim()) {
      setError(
        "Please enter your email address.",
      );
      return;
    }

    if (!password) {
      setError(
        "Please enter your password.",
      );
      return;
    }

    try {
      setLoading(true);

      // Do not sign out an existing confirmation session here. Supabase can
      // safely replace the local session after a successful password login.
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email
            .trim()
            .toLowerCase(),

          password,
        });

      if (loginError) {
        throw loginError;
      }

      const user = data.user;

      if (!user) {
        throw new Error(
          "Unable to retrieve your account.",
        );
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("account_type, full_name")
        .eq("id", user.id)
        .single();

      if (profileError) {
        // Do not guess that a user is a family account when role lookup fails.
        // A role lookup failure is an authentication-routing failure.
        await supabase.auth.signOut({ scope: "local" });
        throw new Error(
          "Your account was authenticated, but DMD-AI could not verify your portal type. Please try again.",
        );
      }

      if (!isAccountType(profile?.account_type)) {
        await supabase.auth.signOut({ scope: "local" });
        throw new Error(
          "This account does not have a valid DMD-AI portal role. Please contact support.",
        );
      }

      // Preserve a guest assessment across authentication and attach it to the
      // authenticated family account before entering the portal.
      if (profile.account_type === "family") {
        await syncPendingAssessment();
      }

      localStorage.removeItem("dmd_ai_after_confirmation");
      navigate(routeForAccountType(profile.account_type), { replace: true });
    } catch (err) {
      console.error("Login error:", err);

      const message = err instanceof Error ? err.message : "Unable to log in.";
      setError(
        message.toLowerCase().includes("invalid login credentials")
          ? "The email or password does not match this account. Your email may already be verified; check the exact password you created, or use password recovery."
          : message,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setRecoverySent(false);
    if (!email.trim()) { setError("Enter your email address first, then choose Forgot password."); return; }
    try {
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (recoveryError) throw recoveryError;
      setRecoverySent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send password recovery email.");
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      setLoading(true);
      const settingsResponse = await fetch(`${supabaseUrl}/auth/v1/settings`, {
        headers: { apikey: supabasePublishableKey },
      });
      const authSettings = await settingsResponse.json();
      if (!authSettings?.external?.google) {
        throw new Error(
          "Google sign-in is not enabled yet. Complete the one-time Google OAuth setup in Supabase before using this button.",
        );
      }
      localStorage.removeItem("dmd_ai_oauth_intent");
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to start Google sign in.";
      setError(message.toLowerCase().includes("provider") ? "Google sign-in needs to be enabled for this DMD-AI project. We will complete the one-time Google setup next." : message);
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-brand-side">
        <button
          type="button"
          className="auth-back-button"
          onClick={() => navigate("/")}
        >
          <ArrowLeft size={20} />
          Back to DMD-AI
        </button>

        <div className="auth-brand-content">
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <Dna size={35} />
            </div>

            <div>
              <strong>DMD-AI</strong>
              <span>
                Clinical & Genomic Intelligence
              </span>
            </div>
          </div>

          <h1>
            One platform.
            <br />
            Different journeys.
            <br />
            <span>One mission.</span>
          </h1>

          <p>
            Secure access for families,
            caregivers and healthcare
            professionals working toward
            better DMD understanding, care
            and research.
          </p>

          <div className="auth-benefit-list">
            <div>
              <ShieldCheck size={23} />

              <span>
                <strong>
                  Privacy-focused access
                </strong>

                <small>
                  Accounts and medical
                  information are separated
                  by appropriate roles.
                </small>
              </span>
            </div>

            <div>
              <Heart size={23} />

              <span>
                <strong>
                  Family-centered experience
                </strong>

                <small>
                  Families receive an
                  experience different from
                  the clinical workspace.
                </small>
              </span>
            </div>

            <div>
              <Stethoscope size={23} />

              <span>
                <strong>
                  Verified clinical access
                </strong>

                <small>
                  Hospital clinical access
                  requires organization
                  verification.
                </small>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-card">
          <div className="auth-form-header">
            <span>WELCOME BACK</span>

            <h2>Log in to DMD-AI</h2>

            <p>
              Your account type determines
              which portal you enter.
            </p>
          </div>

          {emailConfirmed && <div className="auth-success">Email verified successfully. Log in with the account you just confirmed to continue.</div>}
          {passwordReset && <div className="auth-success">Password updated successfully. You can now log in with your new password.</div>}
          {recoverySent && <div className="auth-success">Password recovery email sent. Open the email and choose the recovery link to set a new password.</div>}

          {currentSession && (
            <div className="auth-current-session">
              <div className="auth-current-session-copy">
                <span>CURRENTLY SIGNED IN</span>
                <strong>{currentSession.email}</strong>
                <p>
                  Continue to this account's workspace, or sign out to use a different DMD-AI account.
                </p>
              </div>

              <div className="auth-current-session-actions">
                <button
                  type="button"
                  className="auth-session-continue"
                  onClick={() => navigate(currentSession.destination)}
                >
                  Continue to workspace
                </button>

                <button
                  type="button"
                  className="auth-session-switch"
                  onClick={handleUseAnotherAccount}
                  disabled={loading}
                >
                  Sign out & use another account
                </button>
              </div>
            </div>
          )}

          <button type="button" className="auth-google-button" onClick={handleGoogleLogin} disabled={loading}>
            <span className="google-g">G</span>
            Continue with Google
          </button>
          <div className="auth-divider"><span>or continue with email</span></div>

          <form
            className="auth-form"
            onSubmit={handleSubmit}
          >
            <label>
              Email Address

              <div className="auth-input-wrap">
                <Mail size={20} />

                <input
                  type="email"
                  value={email}
                  placeholder="you@example.com"
                  onChange={(event) =>
                    setEmail(
                      event.target.value,
                    )
                  }
                />
              </div>
            </label>

            <label>
              Password

              <div className="auth-input-wrap">
                <LockKeyhole size={20} />

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  placeholder="Enter your password"
                  onChange={(event) =>
                    setPassword(
                      event.target.value,
                    )
                  }
                />

                <button
                  type="button"
                  className="auth-password-toggle"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current,
                    )
                  }
                >
                  {showPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </label>

            <div className="auth-form-options">
              <label className="auth-checkbox">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>

              <button type="button" className="auth-text-button" onClick={handleForgotPassword}>
                Forgot password?
              </button>
            </div>

            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}

            <button
              className="auth-submit-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Logging In..."
                : "Log In"}
            </button>
          </form>

          <div className="auth-switch">
            <span>
              Don't have an account?
            </span>

            <button
              type="button"
              onClick={() =>
                navigate("/signup")
              }
            >
              Create Account
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Login;