export default async function handler(req, res) {
  // O Vercel reescreve a rota, mas a URL original permanece acessível
  // req.url pode vir como /api/asaas/customers?email=...
  let endpoint = req.url.replace('/api/asaas', '');
  
  // Se o replace não pegou por algum motivo de roteamento, tentamos garantir
  if (endpoint.startsWith('/api/asaas-proxy')) {
    endpoint = endpoint.replace('/api/asaas-proxy', '');
  }
  
  if (!endpoint || endpoint === '/') {
    return res.status(400).json({ error: 'Endpoint não especificado' });
  }

  // Chave Asaas Sandbox. Na Vercel, o ideal é adicionar ASAAS_API_KEY nas Environment Variables
  const fallbackKey = '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjMxYWVmYjI5LTAxNzUtNDU1MC1iMTMwLTIzODkyYzdkMDdlMjo6JGFhY2hfMTVlNzZhYjYtZWZhNi00OWYxLTk0ZDMtYTI0NTNkYjc5ZTEw';
  const apiKey = process.env.ASAAS_API_KEY || fallbackKey;

  const targetUrl = `https://sandbox.asaas.com/api/v3${endpoint}`;

  const options = {
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      'access_token': apiKey,
    }
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    options.body = JSON.stringify(req.body);
  }

  try {
    const response = await fetch(targetUrl, options);
    
    // O Asaas pode retornar 204 No Content
    if (response.status === 204) {
      return res.status(204).end();
    }
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Erro na Vercel Proxy:', error);
    res.status(500).json({ error: 'Erro interno no Proxy Asaas' });
  }
}
