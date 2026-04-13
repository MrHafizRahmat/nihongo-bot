import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Shows a loading screen while auth state is being determined.
// Redirects to /login if not logged in.
// Redirects to correct dashboard if role doesn't match the page.
export default function ProtectedRoute({ children, requiredRole }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif",
        background: "#fdf6ee",
        color: "#9a8880",
        fontSize: "0.9rem",
        letterSpacing: "0.1em",
      }}>
        読み込み中... {/* "Loading..." in Japanese */}
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If profile loaded and role doesn't match, redirect to correct dashboard
  if (profile && requiredRole && profile.role !== requiredRole) {
    return <Navigate to={`/dashboard/${profile.role}`} replace />;
  }

  return children;
}