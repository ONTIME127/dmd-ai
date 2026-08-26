import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { isAccountType, routeForAccountType } from "../lib/authRouting";

type Props = { children: ReactNode; allowed: string[] };
type GateState = { loading: boolean; ok: boolean; redirect: string };

export default function ProtectedRoute({ children, allowed }: Props) {
  const allowedKey = useMemo(() => allowed.join("|"), [allowed]);
  const [state, setState] = useState<GateState>({
    loading: true,
    ok: false,
    redirect: "/login",
  });

  useEffect(() => {
    let active = true;

    void (async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!active) return;

      if (userError || !user) {
        setState({ loading: false, ok: false, redirect: "/login" });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", user.id)
        .single();

      if (!active) return;

      if (profileError || !isAccountType(profile?.account_type)) {
        await supabase.auth.signOut({ scope: "local" });
        setState({ loading: false, ok: false, redirect: "/login" });
        return;
      }

      const ok = allowed.includes(profile.account_type);
      setState({
        loading: false,
        ok,
        redirect: ok ? "" : routeForAccountType(profile.account_type),
      });
    })();

    return () => { active = false; };
  }, [allowedKey]);

  if (state.loading) {
    return <main className="portal-loading">Checking secure access…</main>;
  }

  if (!state.ok) {
    return <Navigate to={state.redirect || "/login"} replace />;
  }

  return <>{children}</>;
}
