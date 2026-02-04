import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoritesState {
  favorites: string[];
  addFavorite: (path: string) => void;
  removeFavorite: (path: string) => void;
  toggleFavorite: (path: string) => void;
  isFavorite: (path: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      addFavorite: (path: string) => {
        set((state) => ({
          favorites: state.favorites.includes(path) 
            ? state.favorites 
            : [...state.favorites, path],
        }));
      },
      removeFavorite: (path: string) => {
        set((state) => ({
          favorites: state.favorites.filter((f) => f !== path),
        }));
      },
      toggleFavorite: (path: string) => {
        const { favorites } = get();
        if (favorites.includes(path)) {
          set({ favorites: favorites.filter((f) => f !== path) });
        } else {
          set({ favorites: [...favorites, path] });
        }
      },
      isFavorite: (path: string) => {
        return get().favorites.includes(path);
      },
    }),
    {
      name: 'radiopharma-favorites',
    }
  )
);
