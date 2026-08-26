import { useState } from "react";
import type { FormEvent } from "react";
import { Dna, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError("");
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The passwords do not match.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(error.message);
    await supabase.auth.signOut({ scope: "local" });
    navigate("/login?password_reset=1", { replace: true });
  };

  return <main className="oauth-callback-page"><div className="oauth-callback-card reset-password-card">
    <div className="auth-logo-icon"><Dna size={34}/></div><h1>Create a new password</h1>
    <p>Choose a new password for your DMD-AI account.</p>
    <form className="auth-form" onSubmit={submit}>
      <label>New Password<div className="auth-input-wrap"><LockKeyhole size={20}/><input type={show?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimum 8 characters"/><button type="button" className="auth-password-toggle" onClick={()=>setShow(v=>!v)}>{show?<EyeOff size={20}/>:<Eye size={20}/>}</button></div></label>
      <label>Confirm New Password<div className="auth-input-wrap"><LockKeyhole size={20}/><input type={show?"text":"password"} value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Enter password again"/></div></label>
      {error && <div className="auth-error">{error}</div>}
      <button className="auth-submit-button" disabled={loading}>{loading?"Updating…":"Update Password"}</button>
    </form>
  </div></main>;
}
