import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { fetchWithCache } from '../services/footballApi';

export function useSoccerData(leagueCode: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState(localStorage.getItem('football_api_key') || '');

  const league = useLiveQuery(() => db.leagues.where('codigo').equals(leagueCode).first(), [leagueCode]);
  const standings = useLiveQuery(() => {
    if (!league) return [];
    return db.standings.where('ligaId').equals(league.id).sortBy('posicion');
  }, [league]);
  const matches = useLiveQuery(() => {
    if (!league) return [];
    return db.matches.where('ligaId').equals(league.id).sortBy('fecha');
  }, [league]);

  const sync = async (overrideKey?: string) => {
    if (!leagueCode) return;
    const keyToUse = overrideKey || apiKey || import.meta.env.VITE_FOOTBALL_API_KEY;
    
    if (!keyToUse) {
      setError('Configura tu API Key en la barra lateral para descargar datos.');
      return;
    }

    setLoading(true);
    try {
      await fetchWithCache(leagueCode, keyToUse);
      setError(null);
    } catch (e: any) {
      let msg = e.message || 'Error desconocido';
      if (msg.includes('429')) msg = 'Límite de peticiones excedido (Plan Free: 10/min). Espera un poco.';
      if (msg.includes('403')) msg = 'Acceso denegado. Esta liga podría no estar en el plan gratuito.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const updateApiKey = (newKey: string) => {
    localStorage.setItem('football_api_key', newKey);
    setApiKey(newKey);
    sync(newKey);
  };

  useEffect(() => {
    const lastUpdated = league?.lastUpdated || 0;
    const oneHour = 60 * 60 * 1000;
    
    if (!league || (Date.now() - lastUpdated > oneHour)) {
      sync();
    }
  }, [leagueCode, league?.id]);

  return {
    league,
    standings,
    matches,
    loading,
    error,
    refresh: sync
  };
}
