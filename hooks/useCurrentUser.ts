"use client";

import { useEffect, useState } from "react";
import type { UserProfile } from "@/types";
import type { MockProject, MockRole } from "@/lib/mock-auth";

interface CurrentUser {
  user: UserProfile | null;
  role: MockRole | null;
  projects: MockProject[];
  loading: boolean;
}

export function useCurrentUser(): CurrentUser {
  const [state, setState] = useState<CurrentUser>({
    user: null,
    role: null,
    projects: [],
    loading: true,
  });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setState({
          user:     data.user     ?? null,
          role:     data.role     ?? null,
          projects: data.projects ?? [],
          loading:  false,
        });
      })
      .catch(() => {
        setState((s) => ({ ...s, loading: false }));
      });
  }, []);

  return state;
}
