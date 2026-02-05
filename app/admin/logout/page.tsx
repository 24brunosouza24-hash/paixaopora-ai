"use client";

import { useEffect } from "react";

export default function AdminLogoutPage() {
  useEffect(() => {
    (async () => {
      await fetch("/api/admin/logout", { method: "POST" });
      window.location.href = "/admin/login";
    })();
  }, []);

  return (
    <main style={{ padding: 20, fontFamily: "Arial" }}>
      <p>Saindo...</p>
    </main>
  );
}
