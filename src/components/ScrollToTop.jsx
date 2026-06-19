import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const key = `refreshed:${pathname}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      window.location.reload();
    } else {
      window.scrollTo(0, 0);
    }

    return () => {
      sessionStorage.removeItem(key);
    };
  }, [pathname]);

  return null;
}