import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  // loading = true until we know the auth state AND profile is fetched
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId) {
    try {
      console.log("Fetching profile:", userId);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      console.log("Profile result:", { data, error });

      if (error) throw error;

      setProfile(data);
      return data;
    } catch (err) {
      console.error("fetchProfile failed:", err);
      return null;
    }
  }

  useEffect(() => {
    // onAuthStateChange fires immediately with the current session,
    // so we use it as the single source of truth — no separate getSession needed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          const currentUser = session?.user ?? null;

          setUser(currentUser);

          if (currentUser) {
            await fetchProfile(currentUser.id);
          } else {
            setProfile(null);
          }
        } catch (err) {
          console.error("Auth init failed:", err);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signUp(email, password, role, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role, full_name: fullName } },
    });
    return { data, error };
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  // Also expose a direct profile fetch for post-login navigation
  async function getProfileRole(userId) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    return data?.role || "student";
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, getProfileRole }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook — use this anywhere in your app
export function useAuth() {
  return useContext(AuthContext);
}