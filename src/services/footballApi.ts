import { Liga, Equipo, TablaPosiciones, Partido, db } from '../db/database';

const PROXY_URLS = [
  '/api/football', // Nuestro proxy interno (Más confiable)
  'https://api.allorigins.win/raw?url=' // Respaldo externo
];

export async function fetchWithCache(leagueCode: string, customApiKey?: string) {
  const API_KEY = customApiKey || localStorage.getItem('football_api_key') || import.meta.env.VITE_FOOTBALL_API_KEY;

  if (!API_KEY) {
    throw new Error('API Key no configurada. Por favor, ingrésala en los ajustes.');
  }

  const headers: any = { 
    'X-Auth-Token': API_KEY,
    'Accept': 'application/json'
  };

  async function smartFetch(path: string) {
    // Intento 1: Nuestro servidor interno (Gratis y maneja CORS)
    try {
      const res = await fetch(`${PROXY_URLS[0]}${path}`, { headers });
      if (res.ok) return await res.json();
      if (res.status === 429) throw new Error('Límite de API alcanzado. Espera 1 minuto.');
      if (res.status === 403 || res.status === 401) throw new Error('API Key inválida o sin acceso a esta liga.');
    } catch (e: any) {
      if (e.message.includes('Límite') || e.message.includes('Key')) throw e;
      console.warn('Proxy interno falló, intentando respaldo externo...');
    }

    // Intento 2: Proxy externo
    const externalUrl = `https://api.football-data.org/v4${path}`;
    const res = await fetch(`${PROXY_URLS[1]}${encodeURIComponent(externalUrl)}`, { headers });
    if (!res.ok) throw new Error(`Error de conexión (${res.status})`);
    return await res.json();
  }

  try {
    // 1. Standings
    const data = await smartFetch(`/competitions/${leagueCode}/standings`);

    if (!data || data.message) {
      throw new Error(data?.message || 'Error desconocido en la API');
    }

    const league = data.competition;
    const season = data.season;

    if (!league) throw new Error('No se encontraron datos de la liga.');

    // Guardar Liga
    await db.leagues.put({
      id: league.id,
      nombre: league.name || 'Liga',
      pais: league.area?.name || 'Internacional',
      codigo: league.code,
      escudoUrl: league.emblem,
      temporada: season?.currentMatchday || 0,
      lastUpdated: Date.now()
    });

    // Guardar Standings
    const table = data.standings?.[0]?.table || [];
    const standingsToSave: TablaPosiciones[] = table.map((item: any) => ({
      ligaId: league.id,
      equipoId: item.team?.id,
      nombreEquipo: item.team?.name || 'Equipo',
      escudoEquipo: item.team?.crest,
      posicion: item.position,
      partidosJugados: item.playedGames,
      ganados: item.won,
      empatados: item.draw,
      perdidos: item.lost,
      gf: item.goalsFor,
      gc: item.goalsAgainst,
      puntos: item.points
    }));

    await db.standings.where('ligaId').equals(league.id).delete();
    await db.standings.bulkPut(standingsToSave);

    // 2. Matches
    try {
      const matchesData = await smartFetch(`/competitions/${leagueCode}/matches?limit=40`);
      if (matchesData && matchesData.matches) {
        const matchesToSave: Partido[] = matchesData.matches.map((m: any) => ({
          id: m.id,
          ligaId: league.id,
          localEquipoId: m.homeTeam?.id,
          localNombre: m.homeTeam?.name || 'Local',
          localEscudo: m.homeTeam?.crest,
          visitanteEquipoId: m.awayTeam?.id,
          visitanteNombre: m.awayTeam?.name || 'Visitante',
          visitanteEscudo: m.awayTeam?.crest,
          fecha: m.utcDate,
          resultadoLocal: m.score?.fullTime?.home ?? null,
          resultadoVisitante: m.score?.fullTime?.away ?? null,
          estado: m.status
        }));

        await db.matches.where('ligaId').equals(league.id).delete();
        await db.matches.bulkPut(matchesToSave);
      }
    } catch (e) {
      console.warn('No se pudieron actualizar partidos, se mantienen los locales.');
    }

  } catch (error: any) {
    console.error(`Error en fetch para ${leagueCode}:`, error);
    throw error;
  }
}
