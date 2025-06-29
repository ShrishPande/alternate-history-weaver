
import React, { useState, useCallback, FormEvent } from 'react';
import { GameState, HistoryEntry } from './types';
import * as geminiService from './services/geminiService';
import Spinner from './components/Spinner';
import ChoiceButton from './components/ChoiceButton';

const formatDisplayYear = (year: number | null): string => {
  if (year === null) return '';
  if (year < 0) return `${-year} BC`;
  return `${year} AD`;
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.SELECTING_YEAR);
  const [yearInput, setYearInput] = useState<string>('1969');
  const [era, setEra] = useState<'AD' | 'BC'>('AD');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [initialEvents, setInitialEvents] = useState<string[]>([]);
  const [historyLog, setHistoryLog] = useState<HistoryEntry[]>([]);
  const [currentChoices, setCurrentChoices] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = () => {
    setGameState(GameState.SELECTING_YEAR);
    setYearInput('1969');
    setEra('AD');
    setSelectedYear(null);
    setInitialEvents([]);
    setHistoryLog([]);
    setCurrentChoices([]);
    setIsLoading(false);
    setError(null);
  };

  const handleYearSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    const yearNum = parseInt(yearInput, 10);
    if (isNaN(yearNum) || yearNum <= 0) {
      setError("Please enter a valid positive year number.");
      return;
    }
    
    const finalYear = era === 'BC' ? -yearNum : yearNum;

    if (finalYear < -4000 || finalYear > new Date().getFullYear()) {
      setError(`Please enter a year between 4000 BC and the current year.`);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const events = await geminiService.getInitialEvents(finalYear);
      setInitialEvents(events);
      setSelectedYear(finalYear);
      setGameState(GameState.SELECTING_EVENT);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [yearInput, era]);

  const handleEventSelect = useCallback(async (event: string) => {
    setIsLoading(true);
    setError(null);
    if (selectedYear === null) {
        setError("No year selected. Please restart.");
        setIsLoading(false);
        return;
    }
    try {
        const { narrative, year, auto_generated_events, choices } = await geminiService.startGame(event, selectedYear);

        const newHistory: HistoryEntry[] = [
            { id: 0, narrative: `It all began with: ${event}`, choice: null, year: selectedYear },
            { id: 1, narrative, choice: null, year: year }
        ];

        let currentId = 2;
        for (const autoEvent of auto_generated_events) {
            newHistory.push({ id: currentId++, narrative: autoEvent.event, choice: null, year: autoEvent.year });
        }

        setHistoryLog(newHistory);
        setCurrentChoices(choices);
        setGameState(GameState.IN_GAME);
    } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
        setIsLoading(false);
    }
}, [selectedYear]);

  const handleChoiceSelect = useCallback(async (choice: string) => {
    setIsLoading(true);
    setError(null);
    
    const lastEntry = historyLog[historyLog.length - 1];
    if (!lastEntry || lastEntry.year === null) {
        setError("Could not determine the last year. Please restart.");
        setIsLoading(false);
        return;
    }
    const lastYear = lastEntry.year;
    const fullHistory = historyLog.map(h => `(${formatDisplayYear(h.year)}) ${h.narrative}`).join('\n\n');

    try {
        const { narrative, year, auto_generated_events, choices } = await geminiService.advanceTimeline(fullHistory, choice, lastYear);
        
        const choiceEntry: HistoryEntry = { ...lastEntry, choice: `I chose to: ${choice}` };
        
        const newHistory: HistoryEntry[] = [
            ...historyLog.slice(0, -1),
            choiceEntry,
            { id: historyLog.length, narrative, choice: null, year: year }
        ];

        let currentId = historyLog.length + 1;
        for (const autoEvent of auto_generated_events) {
            newHistory.push({ id: currentId++, narrative: autoEvent.event, choice: null, year: autoEvent.year });
        }

        setHistoryLog(newHistory);
        
        if (choices.length === 0) {
            setGameState(GameState.GAME_OVER);
            setCurrentChoices([]);
        } else {
            setCurrentChoices(choices);
        }
    } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
        setIsLoading(false);
    }
}, [historyLog]);

  const renderContent = () => {
    if (isLoading && gameState !== GameState.IN_GAME) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <Spinner />
          <p className="mt-4 text-cyan-300">Weaving the threads of time...</p>
        </div>
      );
    }

    if (error) {
        return (
            <div className="text-center p-8 bg-red-900/50 border border-red-500 rounded-lg">
                <h3 className="text-2xl font-bold text-red-300">An Error Occurred</h3>
                <p className="text-red-200 mt-2">{error}</p>
                <button
                    onClick={handleReset}
                    className="mt-6 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                    Start Over
                </button>
            </div>
        );
    }

    switch (gameState) {
      case GameState.SELECTING_YEAR:
        return (
          <form onSubmit={handleYearSubmit} className="flex flex-col items-center gap-4 animate-fade-in">
            <h2 className="text-2xl font-semibold text-cyan-300">Select a Starting Year</h2>
            <p className="text-gray-400 max-w-md text-center">Enter a year in history (e.g., 1776 AD or 753 BC) to see what pivotal moments you can change.</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={yearInput}
                onChange={(e) => setYearInput(e.target.value)}
                className="bg-gray-700 border-2 border-gray-600 focus:border-cyan-500 focus:ring-cyan-500 rounded-lg p-3 text-lg text-white w-48 text-center"
                placeholder="e.g., 1969"
              />
              <select
                value={era}
                onChange={(e) => setEra(e.target.value as 'AD' | 'BC')}
                className="bg-gray-700 border-2 border-gray-600 focus:border-cyan-500 focus:ring-cyan-500 rounded-lg p-3 text-lg text-white"
              >
                <option value="AD">AD</option>
                <option value="BC">BC</option>
              </select>
            </div>
            <button type="submit" disabled={isLoading} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300 ease-in-out disabled:bg-gray-600 disabled:cursor-not-allowed">
              Find Events
            </button>
          </form>
        );
      case GameState.SELECTING_EVENT:
        return (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-semibold text-cyan-300 text-center">Choose Your Starting Point in {formatDisplayYear(selectedYear)}</h2>
            <p className="text-gray-400 text-center mb-6">This choice will be the first thread in your new timeline.</p>
            <div className="flex flex-col gap-4">
              {initialEvents.map((event, index) => (
                <ChoiceButton key={index} onClick={() => handleEventSelect(event)} disabled={isLoading}>
                  {event}
                </ChoiceButton>
              ))}
            </div>
          </div>
        );
      case GameState.IN_GAME:
      case GameState.GAME_OVER:
        return (
            <div className="animate-fade-in">
                <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-4 mb-8 custom-scrollbar">
                    {historyLog.map((entry, index) => (
                        <div key={entry.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 100}ms`}}>
                            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                                <span className="font-bold text-cyan-400 mr-2">{formatDisplayYear(entry.year)}:</span>
                                {entry.narrative}
                            </p>
                            {entry.choice && 
                                <p className="mt-3 text-cyan-300 italic pl-4 border-l-2 border-cyan-500">
                                    {entry.choice}
                                </p>
                            }
                        </div>
                    ))}
                </div>

                {isLoading && (
                    <div className="flex items-center justify-center gap-3 my-4 text-cyan-300">
                        <Spinner size="6" />
                        <span>The future is unfolding...</span>
                    </div>
                )}

                {gameState === GameState.GAME_OVER && (
                    <div className="text-center p-6 bg-gray-700/50 rounded-lg">
                        <h3 className="text-3xl font-bold text-cyan-300">The End of the Line</h3>
                        <p className="text-gray-300 mt-2">Your timeline has reached its conclusion.</p>
                        <button onClick={handleReset} className="mt-6 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                            Weave a New History
                        </button>
                    </div>
                )}
                
                {gameState === GameState.IN_GAME && !isLoading && (
                    <div>
                        <h3 className="text-xl font-semibold text-cyan-300 text-center mb-4">What happens next? Make your choice.</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentChoices.map((choice, index) => (
                                <ChoiceButton key={index} onClick={() => handleChoiceSelect(choice)} disabled={isLoading}>
                                    {choice}
                                </ChoiceButton>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 sm:p-8 flex flex-col items-center">
      <style>{`
        .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in-up { animation: fadeInUp 0.5s ease-in-out forwards; opacity: 0; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #1f2937; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #0891b2; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #06b6d4; }
        /* Make number input arrows white */
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        input[type="number"] {
            -moz-appearance: textfield;
        }
      `}</style>
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-cyan-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
            Alternate History Weaver
          </h1>
          {gameState !== GameState.SELECTING_YEAR && (
             <button onClick={handleReset} className="mt-4 text-gray-400 hover:text-white transition-colors text-sm">Reset Simulation</button>
          )}
        </header>
        <main className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-6 md:p-8 border border-gray-700 min-h-[400px] flex flex-col justify-center">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
