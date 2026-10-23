/** Retired integration. Do not restore upstream requests or credentials. */
export default function handler(_req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(410).json({
    error: 'A integração com o Asaas foi desativada.',
    code: 'INTEGRATION_RETIRED',
  });
}
