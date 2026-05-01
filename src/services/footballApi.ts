import { Liga, Equipo, TablaPosiciones, Partido, db } from '../db/database';

const BASE_URL = 'https://api.football-data.org/v4';
const PROXY_URL = 'https://api.allorigins.win/raw?url=';
const API_KEY = import.meta.env.VITE_FOOTBALL_API_KEY;

export async function fetchWithCache(leagueCode: string) {
  if (!API_KEY) {
    console.warn('VITE_FOOTBALL_API_KEY no encontrada.');
    return;
  }

  const headers = { 'X-Auth-Token': API_KEY };

  try {
    // 1. Fetch Standing (Posiciones)
    const standingsUrl = `${BASE_URL}/competitions/${leagueCode}/standings`;
    const standingsRes = await fetch(`${PROXY_URL}${encodeURIComponent(standingsUrl)}`, { headers });
    
    if (!standingsRes.ok) throw new Error(`Proxy status: ${standingsRes.status}`);

    const data = await standingsRes.json();

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

    // 2. Fetch Matches (Últimos y próximos)
    const matchesUrl = `${BASE_URL}/competitions/${leagueCode}/matches?limit=40`;
    const matchesRes = await fetch(`${PROXY_URL}${encodeURIComponent(matchesUrl)}`, { headers });
    
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
