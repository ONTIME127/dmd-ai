import { useState } from "react";
import type { FormEvent } from "react";

import {
  ArrowLeft,
  Dna,
  Eye,
  EyeOff,
  Hospital,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Stethoscope,
  User,
  Users,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { supabase, supabasePublishableKey, supabaseUrl } from "../lib/supabase";
import { syncPendingAssessment } from "../lib/familyAssessment";

type SignupRole = "family" | "hospital";

function Signup() {
  const navigate = useNavigate();

  const [role, setRole] = useState<SignupRole>("family");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loading, setLoading] = useState(false);
  const [signupCreated, setSignupCreated] = useState(false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Your password must contain at least 8 characters.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const accountType =
        role === "family"
          ? "family"
          : "hospital_applicant";

      // Signup may happen in a browser that still has another DMD-AI account
      // logged in. Clear that local session first so Family and Hospital
      // identities can never be mixed.
      const { data: existingSession } = await supabase.auth.getSession();
      if (existingSession.session) {
        await supabase.auth.signOut({ scope: "local" });
      }

      const { data, error: signupError } =
        await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,

          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?source=email-confirmation&role=${role}`,
            data: {
              full_name: fullName.trim(),
              account_type: accountType,
            },
          },
        });

      if (signupError) {
        throw signupError;
      }

      // Supabase intentionally avoids revealing whether a confirmed account
      // already exists. In the browser client, an empty identities array is a
      // strong signal that this email was already registered. Do not pretend a
      // brand-new account was created or let the user repeatedly submit signup.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setError(
          "An account already exists with this email. Please log in with the existing password or use Forgot password to create a new one.",
        );
        return;
      }

      /*
        If email confirmation is disabled,
        Supabase immediately gives us a session.

        If confirmation is enabled, session can be null.
      */

      if (data.session) {
        if (role === "hospital") {
          navigate("/hospital-application");
          return;
        }

        await syncPendingAssessment();

        setSuccess(
          "Your family account has been created successfully.",
        );

        setTimeout(() => {
          navigate("/");
        }, 1800);

        return;
      }

      /*
        Email confirmation required.
      */

      if (role === "hospital") {
        localStorage.setItem(
          "dmd_ai_after_confirmation",
          "hospital-application",
        );
        setSignupCreated(true);

        setSuccess(
          "Your hospital representative account has been created. Open the verification email and confirm your address. DMD-AI will then take you directly to the hospital registration form — you will not need to log in again.",
        );
      } else {
        localStorage.setItem(
          "dmd_ai_after_confirmation",
          "family",
        );
        setSignupCreated(true);

        setSuccess(
          "Your account has been created. Please check your email and verify your address before logging in.",
        );
      }
    } catch (err) {
      console.error("Signup error:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong while creating your account.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAfterSignup = async () => {
    setError("");
    try {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!session?.user) {
        setError(
          "Please verify your email first. After you click the verification link, DMD-AI will open the correct portal automatically.",
        );
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", session.user.id)
        .single();

      if (profileError || !profile?.account_type) {
        throw new Error("DMD-AI could not determine the portal for this account.");
      }

      if (profile.account_type === "hospital_applicant") {
        navigate("/hospital-application", { replace: true });
      } else if (profile.account_type === "hospital_member") {
        navigate("/hospital", { replace: true });
      } else if (profile.account_type === "family") {
        await syncPendingAssessment();
        navigate("/family", { replace: true });
      } else if (profile.account_type === "admin") {
        navigate("/admin", { replace: true });
      } else {
        throw new Error("This account does not have a valid DMD-AI portal role.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to continue registration.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setSuccess("");
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
      localStorage.setItem("dmd_ai_oauth_intent", role);
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      localStorage.removeItem("dmd_ai_oauth_intent");
      const message = err instanceof Error ? err.message : "Unable to start Google sign up.";
      setError(message.toLowerCase().includes("provider") ? "Google sign-up needs to be enabled for this DMD-AI project. We will complete the one-time Google setup next." : message);
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
              <span>Clinical & Genomic Intelligence</span>
            </div>
          </div>

          {role === "family" ? (
            <>
              <h1>
                Support built
                <br />
                around your
                <br />
                <span>family.</span>
              </h1>

              <p>
                Create your family account to access clearer
                DMD information, resources, records, and
                family-centered support tools.
              </p>

              <div className="auth-benefit-list">
                <div>
                  <ShieldCheck size={23} />

                  <span>
                    <strong>Private family account</strong>
                    <small>
                      Your account is separated from clinical
                      organization workspaces.
                    </small>
                  </span>
                </div>

                <div>
                  <Users size={23} />

                  <span>
                    <strong>Family-centered experience</strong>
                    <small>
                      Information and tools designed for
                      families and caregivers.
                    </small>
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <h1>
                Verified access
                <br />
                for trusted
                <br />
                <span>clinical teams.</span>
              </h1>

              <p>
                Create the authorized representative account
                first. Your hospital will then complete
                organization verification before receiving
                access to clinical functionality.
              </p>

              <div className="auth-benefit-list">
                <div>
                  <Hospital size={23} />

                  <span>
                    <strong>
                      Hospital verification required
                    </strong>

                    <small>
                      Clinical access remains locked until the
                      organization has been reviewed.
                    </small>
                  </span>
                </div>

                <div>
                  <Stethoscope size={23} />

                  <span>
                    <strong>Professional workspace</strong>

                    <small>
                      Approved hospitals receive the clinical
                      DMD-AI experience.
                    </small>
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-card">
          <div className="auth-form-header">
            <span>CREATE YOUR ACCOUNT</span>

            <h2>
              {role === "family"
                ? "Join DMD-AI"
                : "Start Hospital Registration"}
            </h2>

            <p>
              {role === "family"
                ? "Create your family or caregiver account."
                : "First create the account of the authorized hospital representative."}
            </p>
          </div>

          <div className="auth-role-selector">
            <button
              type="button"
              className={
                role === "family"
                  ? "auth-role active"
                  : "auth-role"
              }
              onClick={() => {
                setRole("family");
                setError("");
                setSuccess("");
                setSignupCreated(false);
              }}
            >
              <Users size={23} />

              <span>
                <strong>Family / Caregiver</strong>
                <small>Family Portal</small>
              </span>
            </button>

            <button
              type="button"
              className={
                role === "hospital"
                  ? "auth-role active"
                  : "auth-role"
              }
              onClick={() => {
                setRole("hospital");
                setError("");
                setSuccess("");
                setSignupCreated(false);
              }}
            >
              <Hospital size={23} />

              <span>
                <strong>
                  Hospital / Clinical Organization
                </strong>
                <small>Clinical Platform</small>
              </span>
            </button>
          </div>

          <button type="button" className="auth-google-button" onClick={handleGoogleSignup} disabled={loading}>
            <span className="google-g">G</span>
            {role === "hospital" ? "Continue Hospital Registration with Google" : "Continue with Google"}
          </button>
          <div className="auth-divider"><span>or create account with email</span></div>

          {role === "hospital" && (
            <div className="auth-professional-notice">
              Creating this account does not automatically
              provide clinical access. Your hospital must
              complete organization verification.
            </div>
          )}

          <form
            className="auth-form"
            onSubmit={handleSubmit}
          >
            <label>
              Full Name

              <div className="auth-input-wrap">
                <User size={20} />

                <input
                  type="text"
                  value={fullName}
                  placeholder={
                    role === "hospital"
                      ? "Authorized representative's full name"
                      : "Enter your full name"
                  }
                  onChange={(event) =>
                    setFullName(event.target.value)
                  }
                />
              </div>
            </label>

            <label>
              {role === "hospital"
                ? "Official Work Email"
                : "Email Address"}

              <div className="auth-input-wrap">
                <Mail size={20} />

                <input
                  type="email"
                  value={email}
                  placeholder={
                    role === "hospital"
                      ? "doctor@hospital.org"
                      : "you@example.com"
                  }
                  onChange={(event) =>
                    setEmail(event.target.value)
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
                  placeholder="Minimum 8 characters"
                  onChange={(event) =>
                    setPassword(event.target.value)
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
                      (current) => !current,
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

            <label>
              Confirm Password

              <div className="auth-input-wrap">
                <LockKeyhole size={20} />

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={confirmPassword}
                  placeholder="Enter password again"
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value,
                    )
                  }
                />
              </div>
            </label>

            <label className="auth-checkbox auth-terms">
              <input type="checkbox" required />

              <span>
                I agree to the Terms, Privacy Policy and
                Medical Disclaimer.
              </span>
            </label>

            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}

            {success && (
              <div className="auth-success">
                {success}
              </div>
            )}

            {signupCreated ? (
              <button
                className="auth-submit-button"
                type="button"
                disabled={loading}
                onClick={handleContinueAfterSignup}
              >
                {loading
                  ? "Checking verification..."
                  : role === "hospital"
                    ? "I've Verified My Email — Continue Registration"
                    : "I've Verified My Email — Continue"}
              </button>
            ) : (
              <button
                className="auth-submit-button"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Creating Account..."
                  : role === "family"
                    ? "Create Family Account"
                    : "Create Hospital Representative Account"}
              </button>
            )}
          </form>

          <div className="auth-switch">
            <span>Already have an account?</span>

            <button
              type="button"
              onClick={() =>
                navigate("/login")
              }
            >
              Log In
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Signup;