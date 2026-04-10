/**
 * Ambient Deno types for Edge Functions when the editor uses tsserver instead of the Deno LSP.
 * Runtime is Deno on Supabase; see deno.json.
 */
declare const Deno: {
  serve: (
    handler: (request: Request) => Response | Promise<Response> | void | Promise<void>
  ) => void
  env: {
    get(key: string): string | undefined
  }
}

/** Map Deno remote import to the same types as the app’s npm package. */
declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js'
}
