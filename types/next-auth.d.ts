import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role?: "quality_owner" | "contributor";
      projectId?: string;
    };
  }

  interface User {
    role?: "quality_owner" | "contributor";
    projectId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "quality_owner" | "contributor";
    projectId?: string;
  }
}
