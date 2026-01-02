"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const SELECTED_CAR_STORAGE_KEY = "garagelog_lastCarId";

interface SelectedCarContextType {
  selectedCarId: string | null;
  setSelectedCarId: (carId: string | null) => void;
}

const SelectedCarContext = createContext<SelectedCarContextType | undefined>(undefined);

export function SelectedCarProvider({ children }: { children: React.ReactNode }) {
  const [selectedCarId, setSelectedCarIdState] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // localStorageから初期値を読み込む
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    try {
      const stored = localStorage.getItem(SELECTED_CAR_STORAGE_KEY);
      if (stored) {
        setSelectedCarIdState(stored);
      }
    } catch (error) {
      console.error("Failed to read selectedCarId from localStorage:", error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // selectedCarIdが変更されたときにlocalStorageに保存
  const setSelectedCarId = useCallback((carId: string | null) => {
    setSelectedCarIdState(carId);
    
    if (typeof window === "undefined") return;
    
    try {
      if (carId) {
        localStorage.setItem(SELECTED_CAR_STORAGE_KEY, carId);
      } else {
        localStorage.removeItem(SELECTED_CAR_STORAGE_KEY);
      }
    } catch (error) {
      console.error("Failed to save selectedCarId to localStorage:", error);
    }
  }, []);

  return (
    <SelectedCarContext.Provider
      value={{
        selectedCarId: isInitialized ? selectedCarId : null,
        setSelectedCarId,
      }}
    >
      {children}
    </SelectedCarContext.Provider>
  );
}

export function useSelectedCar() {
  const context = useContext(SelectedCarContext);
  if (context === undefined) {
    throw new Error("useSelectedCar must be used within a SelectedCarProvider");
  }
  return context;
}

