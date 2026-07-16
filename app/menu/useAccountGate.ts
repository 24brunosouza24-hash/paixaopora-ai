"use client";

import { useCallback, useState } from "react";

type EnsureOptions = {
  onNeedAuth: () => void; // abre o modal
};

export function useAccountGate({ onNeedAuth }: EnsureOptions) {
  const [checking, setChecking] = useState(false);

  const ensureAuthed = useCallback(
    async (actionIfAuthed: () => void | Promise<void>) => {
      if (checking) return;

      setChecking(true);
      try {
        const r = await fetch("/api/me", { method: "GET" });

        // Não logado → abre modal
        if (r.status === 401) {
          onNeedAuth();
          return;
        }

        // Se der outro erro, também força auth (mais seguro)
        if (!r.ok) {
          onNeedAuth();
          return;
        }

        // Logado → executa ação (adicionar no carrinho)
        await actionIfAuthed();
      } finally {
        setChecking(false);
      }
    },
    [checking, onNeedAuth]
  );

  return { ensureAuthed, checking };
}
