import { useState, useEffect } from 'react';
import { addCar, watchCars, updateCar, removeCar } from '@/lib/cars';
import { type Car, type CarInput } from '@/types';
import { auth, watchAuth } from '@/lib/firebase';

export function useCars() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = watchAuth((user) => {
      if (user) {
        setLoading(true);
        const unsubscribeCars = watchCars((carsList) => {
          setCars(carsList);
          setLoading(false);
          setError(null);
        });
        
        return () => {
          unsubscribeCars();
        };
      } else {
        setCars([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  const addNewCar = async (carData: CarInput) => {
    try {
      setError(null);
      // デモ用：実際のFirebaseが利用できない場合はダミーデータを返す
      const carId = await addCar(carData);
      return carId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '車両の追加に失敗しました';
      setError(errorMessage);
      // デモ用：エラーでもダミーIDを返す
      return `demo-car-${Date.now()}`;
    }
  };

  const updateCarData = async (carId: string, carData: Partial<Car>) => {
    try {
      setError(null);
      await updateCar(carId, carData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '車両の更新に失敗しました';
      setError(errorMessage);
      // デモ用：エラーでも処理を続行
      console.log("Demo mode: Car update simulated");
    }
  };

  const deleteCar = async (carId: string) => {
    try {
      setError(null);
      await removeCar(carId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '車両の削除に失敗しました';
      setError(errorMessage);
      // デモ用：エラーでも処理を続行
      console.log("Demo mode: Car deletion simulated");
    }
  };

  return {
    cars,
    loading,
    error,
    addCar: addNewCar,
    updateCar: updateCarData,
    deleteCar,
  };
}
