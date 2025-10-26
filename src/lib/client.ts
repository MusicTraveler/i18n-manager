import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { type inferRouterOutputs } from "@trpc/server";
import superjson from "superjson";
import type { AppRouter } from "./trpc";

// Infer the Message type from the tRPC router output
type RouterOutput = inferRouterOutputs<AppRouter>;
export type Message = RouterOutput["list"][number];

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
    }),
  ],
});

