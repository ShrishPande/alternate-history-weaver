
export enum GameState {
  SELECTING_YEAR,
  SELECTING_EVENT,
  IN_GAME,
  GAME_OVER,
}

export interface HistoryEntry {
    id: number;
    narrative: string;
    choice: string | null;
    year: number | null;
}
