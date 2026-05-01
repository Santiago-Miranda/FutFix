import Dexie, { Table } from 'dexie';

export interface Liga {
  id: number;
  nombre: string;
  pais: string;
  codigo: string;
  escudoUrl: string;
  temporada: number;
  lastUpdated: number;
}

export interface Equipo {
  id: number;
  nombre: string;
  nombreCorto: string;
  tla: string;
  escudoUrl: string;
  ligaId: number;
}

export interface TablaPosiciones {
  id?: string; // id autoincremental o compuesto: ligaId-equipoId
  ligaId: number;
  equipoId: number;
  nombreEquipo: string;
  escudoEquipo: string;
  posicion: number;
  partidosJugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  gf: number;
  gc: number;
  puntos: number;
}

export interface Partido {
  id: number;
  ligaId: number;
  localEquipoId: number;
  localNombre: string;
  localEscudo: string;
  visitanteEquipoId: number;
  visitanteNombre: string;
  visitanteEscudo: string;
  fecha: string;
  resultadoLocal: number | null;
  resultadoVisitante: number | null;
  estado: string;
}

export class SoccerDB extends Dexie {
  leagues!: Table<Liga>;
  teams!: Table<Equipo>;
  standings!: Table<TablaPosiciones>;
  matches!: Table<Partido>;

  constructor() {
    super('SoccerDB');
    this.version(1).stores({
      leagues: 'id, codigo',
      teams: 'id, ligaId',
      standings: '++id, ligaId, equipoId',
      matches: 'id, ligaId, fecha, estado'
    });
  }
}

export const db = new SoccerDB();
