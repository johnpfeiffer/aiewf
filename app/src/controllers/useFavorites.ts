import { useCallback, useEffect, useState } from "react";
import {
  clearFavoriteIds,
  loadFavoriteIds,
  saveFavoriteIds,
} from "../models/favorites";

export interface UseFavorites {
  ids: string[];
  idSet: Set<string>;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  addFavorite: (id: string) => void;
  removeFavorite: (id: string) => void;
  clearFavorites: () => void;
  count: number;
}

export function useFavorites(): UseFavorites {
  const [ids, setIds] = useState<string[]>(() => loadFavoriteIds());

  useEffect(() => {
    saveFavoriteIds(ids);
  }, [ids]);

  const idSet = new Set(ids);

  const isFavorite = useCallback(
    (id: string) => idSet.has(id),
    // idSet is recreated each render; isFavorite is stable enough for list rendering
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids],
  );

  const addFavorite = useCallback((id: string) => {
    setIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setIds((current) => current.filter((value) => value !== id));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }, []);

  const clearFavorites = useCallback(() => {
    clearFavoriteIds();
    setIds([]);
  }, []);

  return {
    ids,
    idSet,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    clearFavorites,
    count: ids.length,
  };
}
