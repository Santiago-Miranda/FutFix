import { Liga, Equipo, TablaPosiciones, Partido, db } from '../db/database';

const BASE_URL = 'https://api.football-data.org/v4';
const PROXY_URL = 'https://api.allorigins.win/raw?url=';

export async function fetchWithCache(leagueCode: string, customApiKey?: string) {
  const API_KEY = customApiKey || import.meta.env.VITE_FOOTBALL_API_KEY;

  if (!API_KEY) {
    throw new Error('No se encontró la API Key. Por favor, configúrala en el menú.');
  }

  const headers = { 
    'X-Auth-Token': API_KEY,
    'Accept': 'application/json'
  };

  try {
    // Intentamos usar la ruta directa si estamos en Vercel o local con rewrites, 
    // sino usamos el proxy de fallback.
    const getStandingUrl = (code: string) => `${BASE_URL}/competitions/${code}/standings`;
    const getMatchesUrl = (code: string) => `${BASE_URL}/competitions/${code}/matches?limit=40`;

    // Intentamos fetch. Nota: Si falla por CORS, el catch lo capturará.
    let response;
    try {
      // Intento 1: A través de Vercel Rewrite (si existe)
      response = await fetch(`/api/football/competitions/${leagueCode}/standings`, { headers });
      if (!response.ok) throw new Error('Rewrite not available');
    } catch {
      // Intento 2: A través de AllOrigins Proxy
      const url = getStandingUrl(leagueCode);
      response = await fetch(`${PROXY_URL}${encodeURIComponent(url)}`, { headers });
    }
    
    if (!response.ok) {
      if (response.status === 403) throw new Error('API Key inválida o sin permisos (Plan Free limitado)');
      if (response.status === 429) throw new Error('Demasiadas peticiones. Espera un minuto.');
      throw new Error(`Error de red: ${response.status}`);
    }

    const data = await response.json();

    // Validar si la API devolvió un error (ej: Token inválido)
    if (data.message && !data.competition) {
      throw new Error(`API Error: ${data.message}`);
    }

    if (!data.competition || !data.standings) {
      throw new Error('La respuesta de la API no contiene datos de liga o posiciones.');
    }

    const league = data.competition;
    const season = data.season;

    // Guardar Liga
    await db.leagues.put({
      id: league.id,
      nombre: league.name || 'Liga Desconocida',
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
      nombreEquipo: item.team?.name || 'Equipo Desconocido',
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

    // Borrar viejos standings de esta liga y guardar nuevos
    await db.standings.where('ligaId').equals(league.id).delete();
    await db.standings.bulkPut(standingsToSave);

    // 2. Fetch Matches
    let matchesRes;
    try {
      matchesRes = await fetch(`/api/football/competitions/${leagueCode}/matches?limit=40`, { headers });
      if (!matchesRes.ok) throw new Error('Rewrite failed');
    } catch {
      const mUrl = getMatchesUrl(leagueCode);
      matchesRes = await fetch(`${PROXY_URL}${encodeURIComponent(mUrl)}`, { headers });
    }
    
    if (matchesRes.ok) {
        const matchesData = await matchesRes.json();
        if (matchesData.matches && matchesData.competition) {
          const leagueId = matchesData.competition.id;
          const matchesToSave: Partido[] = matchesData.matches.map((m: any) => ({
              id: m.id,
              ligaId: leagueId,
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

          await db.matches.where('ligaId').equals(leagueId).delete();
          await db.matches.bulkPut(matchesToSave);
        }
    }

  } catch (error) {
    console.error(`Error en fetch para ${leagueCode}:`, error);
    throw error;
  }
}
