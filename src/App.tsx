import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Calendar, ChevronRight, Menu, X, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { useSoccerData } from './hooks/useSoccerData';

const LEAGUES = [
  { code: 'PL', name: 'Premier League', region: 'England', color: 'border-purple-500' },
  { code: 'PD', name: 'La Liga', region: 'Spain', color: 'border-yellow-500' },
  { code: 'BL1', name: 'Bundesliga', region: 'Germany', color: 'border-red-500' },
  { code: 'SA', name: 'Serie A', region: 'Italy', color: 'border-blue-500' },
  { code: 'CL', name: 'Champions League', region: 'Europe', color: 'border-blue-700' },
];

export default function App() {
  const [selectedLeague, setSelectedLeague] = useState(LEAGUES[0]);
  const [activeTab, setActiveTab] = useState<'standings' | 'matches'>('standings');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { league, standings, matches, loading, error } = useSoccerData(selectedLeague.code);

  const hasApiKey = !!import.meta.env.VITE_FOOTBALL_API_KEY;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 glass sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">Futbolista</span>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Sidebar - Navigation */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth >= 768) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className={`fixed md:relative inset-y-0 left-0 w-72 glass z-50 md:z-auto transition-all p-6 flex flex-col gap-8 ${
              !isSidebarOpen && 'hidden md:flex'
            }`}
          >
            <div className="hidden md:flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-2xl tracking-tighter">Futbolista</span>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide py-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4 px-2">Ligas Principales</h3>
              <div className="flex flex-col gap-2">
                {LEAGUES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setSelectedLeague(l);
                      setIsSidebarOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                      selectedLeague.code === l.code
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                        : 'hover:bg-white/5 text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    <div className={`w-1.5 h-6 rounded-full bg-current opacity-20 group-hover:opacity-100 transition-opacity`}></div>
                    <span className="flex-1 text-left font-medium">{l.name}</span>
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transform transition-all group-hover:translate-x-1" />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-white/5">
              {!hasApiKey && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl flex gap-3 text-xs text-yellow-500 mb-4">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p>Sin API Key. Mostrando solo datos en caché. Configura VITE_FOOTBALL_API_KEY para actualizar.</p>
                </div>
              )}
              <div className="flex items-center gap-3 text-slate-500">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs font-medium">Modo PWA / Offline</span>
              </div>
            </div>

            {/* Close Button for mobile */}
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden absolute top-4 right-4 p-2 text-slate-400">
              <X className="w-6 h-6" />
            </button>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 md:p-8 gap-6 overflow-y-auto">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-blue-400 font-medium">
              <span className="text-sm uppercase tracking-widest">{selectedLeague.region}</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">{selectedLeague.name}</h1>
          </div>

          <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
            <button
              onClick={() => setActiveTab('standings')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'standings' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Posiciones
            </button>
            <button
              onClick={() => setActiveTab('matches')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'matches' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Partidos
            </button>
          </div>
        </header>

        {loading && (
          <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Actualizando datos desde football-data.org...</span>
          </div>
        )}

        {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{error}</span>
            </div>
        )}

        <div className="flex-1">
          <AnimatePresence mode="wait">
            {activeTab === 'standings' ? (
              <motion.div
                key="standings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass rounded-2xl overflow-hidden"
              >
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                    <thead className="bg-white/5 text-slate-400 text-xs font-bold uppercase tracking-widest">
                        <tr>
                        <th className="px-6 py-4">#</th>
                        <th className="px-6 py-4">Equipo</th>
                        <th className="px-6 py-4">PJ</th>
                        <th className="px-6 py-4">G</th>
                        <th className="px-6 py-4">E</th>
                        <th className="px-6 py-4">P</th>
                        <th className="px-6 py-4 text-center">Pts</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {standings?.map((team) => (
                        <tr key={team.id} className="hover:bg-white/5 transition-colors group">
                            <td className="px-6 py-4 font-mono text-sm text-slate-500">{team.posicion}</td>
                            <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                {team.escudoEquipo && (
                                <img src={team.escudoEquipo} alt="" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
                                )}
                                <span className="font-semibold text-slate-200">{team.nombreEquipo}</span>
                            </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-400">{team.partidosJugados}</td>
                            <td className="px-6 py-4 text-sm text-slate-400 font-medium text-green-500/80">{team.ganados}</td>
                            <td className="px-6 py-4 text-sm text-slate-400">{team.empatados}</td>
                            <td className="px-6 py-4 text-sm text-slate-400 font-medium text-red-500/80">{team.perdidos}</td>
                            <td className="px-6 py-4 text-center">
                            <span className="inline-block px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg font-bold">
                                {team.puntos}
                            </span>
                            </td>
                        </tr>
                        ))}
                        {(!standings || standings.length === 0) && !loading && (
                            <tr>
                                <td colSpan={7} className="px-6 py-20 text-center text-slate-500 italic">
                                    No hay datos disponibles en caché. Conéctate para descargar tablas.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    </table>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="matches"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid gap-4 grid-cols-1 lg:grid-cols-2"
              >
                {matches?.slice().reverse().map((match) => (
                  <div key={match.id} className="glass p-5 rounded-2xl flex flex-col gap-4 group hover:border-white/20 transition-all">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <span>{new Date(match.fecha).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      <span className={`px-2 py-0.5 rounded ${match.estado === 'FINISHED' ? 'bg-slate-800 text-slate-400' : 'bg-blue-900/40 text-blue-400'}`}>
                        {match.estado === 'FINISHED' ? 'Finalizado' : 'Próximo'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-[1fr_80px_1fr] items-center gap-4">
                      {/* Home */}
                      <div className="flex flex-col items-center text-center gap-3">
                        <img src={match.localEscudo} alt="" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
                        <span className="font-bold text-sm leading-tight line-clamp-1">{match.localNombre}</span>
                      </div>

                      {/* Score/Time */}
                      <div className="flex flex-col items-center gap-1">
                        {match.estado === 'FINISHED' ? (
                          <div className="flex items-center gap-2 text-2xl font-black tabular-nums">
                            <span>{match.resultadoLocal}</span>
                            <span className="opacity-20">-</span>
                            <span>{match.resultadoVisitante}</span>
                          </div>
                        ) : (
                          <div className="px-3 py-1 bg-white/5 rounded-lg text-sm font-mono font-bold text-blue-400">
                            {new Date(match.fecha).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </div>
                        )}
                      </div>

                      {/* Away */}
                      <div className="flex flex-col items-center text-center gap-3">
                        <img src={match.visitanteEscudo} alt="" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
                        <span className="font-bold text-sm leading-tight line-clamp-1">{match.visitanteNombre}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {(!matches || matches.length === 0) && !loading && (
                    <div className="col-span-full py-20 text-center text-slate-500 italic glass rounded-2xl">
                        No hay partidos recientes en caché.
                    </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <footer className="mt-auto pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 text-xs">
            <div className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                <p>Datos provistos por football-data.org (Free Tier)</p>
            </div>
            <div className="flex items-center gap-4">
                <p>Diseñado para modo Offline</p>
                <p className="font-mono">v1.0.0</p>
            </div>
        </footer>
      </main>
    </div>
  );
}
