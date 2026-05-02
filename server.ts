import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  // Prioridad: 1. LocalStorage (cliente), 2. .env (VITE_), 3. .env (Directo)
  const DEFAULT_API_KEY = process.env.VITE_FOOTBALL_API_KEY || process.env.FOOTBALL_API_KEY;

  app.use(express.json());

  // Proxy API Route - Esto soluciona el CORS
  app.get('/api/football/*', async (req, res) => {
    const apiPath = req.params[0];
    const queryParams = new URLSearchParams(req.query as any).toString();
    const url = `https://api.football-data.org/v4/${apiPath}${queryParams ? '?' + queryParams : ''}`;
    
    // El cliente puede enviar su propia llave en el header o usar la del servidor
    const clientKey = req.headers['x-auth-token'];
    const token = clientKey || DEFAULT_API_KEY;

    if (!token) {
      return res.status(401).json({ message: 'No API Token provided' });
    }

    try {
      console.log(`Proxying request to: ${url}`);
      const response = await fetch(url, {
        headers: { 
          'X-Auth-Token': token as string,
          'Accept': 'application/json'
        },
        timeout: 10000 
      });

      const data = await response.json();
      
      if (!response.ok) {
        return res.status(response.status).json({
          message: data.message || `Error de API (${response.status})`,
          errorCode: data.errorCode
        });
      }

      res.status(200).json(data);
    } catch (error: any) {
      console.error('Proxy error:', error.message);
      res.status(502).json({ message: 'Error de red o timeout al conectar con la API de fútbol' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor PWA Fútbol corriendo en http://localhost:${PORT}`);
  });
}

startServer();
