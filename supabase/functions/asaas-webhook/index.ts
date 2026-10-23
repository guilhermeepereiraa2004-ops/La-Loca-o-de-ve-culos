/** Retired integration: no credentials, network requests or database writes. */
Deno.serve(() => new Response(
  JSON.stringify({ error: 'Integração desativada.', code: 'INTEGRATION_RETIRED' }),
  {
    status: 410,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  },
));
