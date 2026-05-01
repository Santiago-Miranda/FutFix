import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { fetchWithCache } from '../services/footballApi';

export function useSoccerData(leagueCode: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const league = useLiveQuery(() => db.leagues.where('codigo').equals(leagueCode).first(), [leagueCode]);
  const standings = useLiveQuery(() => {
    if (!league) return [];
    return db.standings.where('ligaId').equals(league.id).sortBy('posicion');
  }, [league]);
  const matches = useLiveQuery(() => {
    if (!league) return [];
    return db.matches.where('ligaId').equals(league.id).sortBy('fecha');
  }, [league]);

  useEffect(() => {
    async function sync() {
      if (!leagueCode) return;
      
      // Intentar actualizar si no hay datos o los datos tienen más de 1 hora
      const lastUpdated = league?.lastUpdated || 0;
      const oneHour = 60 * 60 * 1000;
      
      if (!league || (Date.now() - lastUpdated > oneHour)) {
        setLoading(true);
        try {
          await fetchWithCache(leagueCode);
          setError(null);
        } catch (e) {
          setError('No se pudo actualizar los datos. Usando versión local.');
        } finally {
          setLoading(false);
        }
      }
    }

    sync();
  }, [leagueCode, league?.id]);

  return {
    league,
    standings,
    matches,
    loading,
    error
  };
}
