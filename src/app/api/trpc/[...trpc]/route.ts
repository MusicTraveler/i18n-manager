import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/lib/trpc";
import { getDb } from "@/db";

const handler = async (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => {
      const db = getDb();
      return { db };
    },
    onError: ({ error, path }) => {
      console.error(`[tRPC Error] ${path}: ${error.message}`);
    },
  });

export { handler as GET, handler as POST };

