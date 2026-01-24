import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SELECTED_CAR_KEY = '@garagelog:selectedCarId';

interface Car {
  id: string;
  name: string;
  modelCode?: string;
}

export default function CarSelectScreen() {
  const router = useRouter();
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCars();
  }, []);

  const loadCars = async () => {
    const user = auth.currentUser;
    if (!user) {
      router.replace('/onboarding');
      return;
    }

    try {
      const carsRef = collection(db, 'cars');
      const q = query(carsRef, where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      
      const carsData: Car[] = [];
      snapshot.forEach((doc) => {
        carsData.push({
          id: doc.id,
          ...doc.data(),
        } as Car);
      });

      setCars(carsData);
    } catch (error: any) {
      Alert.alert('エラー', '車の一覧を取得できませんでした');
      console.error('Error loading cars:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCar = async (carId: string) => {
    try {
      await AsyncStorage.setItem(SELECTED_CAR_KEY, carId);
      router.replace('/home');
    } catch (error) {
      Alert.alert('エラー', '車の選択に失敗しました');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (cars.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>登録されている車がありません</Text>
        <Text style={styles.emptySubtext}>Web版で車を登録してください</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>車を選択</Text>
      <FlatList
        data={cars}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.carCard}
            onPress={() => handleSelectCar(item.id)}
          >
            <Text style={styles.carName}>{item.name}</Text>
            {item.modelCode && (
              <Text style={styles.carModel}>{item.modelCode}</Text>
            )}
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 24,
  },
  list: {
    gap: 12,
  },
  carCard: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  carName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  carModel: {
    fontSize: 14,
    color: '#64748b',
  },
  emptyText: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 48,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
  },
});
