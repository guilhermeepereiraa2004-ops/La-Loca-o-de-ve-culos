// Types for Deno and ESM imports in Supabase Edge Functions
// This allows the IDE's TypeScript language server to resolve types correctly.

declare namespace Deno {
  interface Env {
    get(key: string): string | undefined;
  }
  const env: Env;

  interface ServeOptions {
    port?: number;
    hostname?: string;
    onError?: (error: unknown) => Response | Promise<Response>;
    onListen?: (params: { port: number; hostname: string }) => void;
  }

  type ServeHandler = (
    request: Request,
    info: { remoteAddr: { transport: "tcp"; hostname: string; port: number } }
  ) => Response | Promise<Response>;

  function serve(handler: ServeHandler): void;
  function serve(options: ServeOptions, handler: ServeHandler): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export * from "@supabase/supabase-js";
}
