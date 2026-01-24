import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Sharing from 'expo-sharing';

const SELECTED_CAR_KEY = '@garagelog:selectedCarId';

interface Car {
  id: string;
  name: string;
  modelCode?: string;
  mileage?: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const [car, setCar] = useState<Car | null>(null);
  const [nextMaintenanceKm, setNextMaintenanceKm] = useState<number | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<boolean>(false);

  useEffect(() => {
    checkNotificationPermission();
    loadCar();
  }, []);

  const checkNotificationPermission = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationPermission(status === 'granted');
  };

  const loadCar = async () => {
    const user = auth.currentUser;
    if (!user) {
      router.replace('/onboarding');
      return;
    }

    try {
      const selectedCarId = await AsyncStorage.getItem(SELECTED_CAR_KEY);
      if (!selectedCarId) {
        router.replace('/cars/select');
        return;
      }

      const carRef = doc(db, 'cars', selectedCarId);
      const carSnap = await getDoc(carRef);
      
      if (carSnap.exists()) {
        const carData = { id: carSnap.id, ...carSnap.data() } as Car;
        setCar(carData);
        
        // 次回メンテの計算（仮のロジック）
        // 実際にはmaintenanceRecordsから次回メンテを計算する
        if (carData.mileage) {
          // 例: 現在の走行距離 + 5000km が次回メンテ
          setNextMaintenanceKm(carData.mileage + 5000);
        }
      } else {
        Alert.alert('エラー', '車の情報を取得できませんでした');
        router.replace('/cars/select');
      }
    } catch (error) {
      console.error('Error loading car:', error);
      Alert.alert('エラー', '車の情報を読み込めませんでした');
    }
  };

  const requestNotificationPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      setNotificationPermission(true);
      Alert.alert('成功', '通知が有効になりました');
    } else {
      Alert.alert('通知が無効です', '設定から通知を有効にしてください');
    }
  };

  const scheduleTestNotification = async () => {
    if (!notificationPermission) {
      Alert.alert('通知が無効です', 'まず通知を有効にしてください');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'GarageLog テスト通知',
        body: '5秒後の通知テストです',
        sound: true,
      },
      trigger: {
        seconds: 5,
      },
    });

    Alert.alert('通知をスケジュールしました', '5秒後に通知が表示されます');
  };

  const handleSharePDF = async () => {
    // ダミーのPDF共有（実際にはPDFを生成して共有）
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('エラー', 'このデバイスでは共有機能が利用できません');
      return;
    }

    // 実際の実装では、PDFを生成してから共有する
    Alert.alert('PDF共有', 'PDF共有機能は今後実装予定です');
  };

  if (!car) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  const remainingKm = nextMaintenanceKm && car.mileage
    ? nextMaintenanceKm - car.mileage
    : null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.carName}>{car.name}</Text>
        {car.modelCode && (
          <Text style={styles.carModel}>{car.modelCode}</Text>
        )}

        {/* 次回メンテカード */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>次回メンテ</Text>
          {remainingKm !== null ? (
            <>
              <Text style={styles.cardValue}>{remainingKm.toLocaleString()}km</Text>
              <Text style={styles.cardSubtext}>次回まで残り</Text>
            </>
          ) : (
            <Text style={styles.cardSubtext}>走行距離を登録してください</Text>
          )}
        </View>

        {/* 通知設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>通知設定</Text>
          {!notificationPermission ? (
            <TouchableOpacity
              style={styles.button}
              onPress={requestNotificationPermission}
            >
              <Text style={styles.buttonText}>通知をオンにする</Text>
            </TouchableOpacity>
          ) : (
            <View>
              <Text style={styles.successText}>✓ 通知が有効です</Text>
              <TouchableOpacity
                style={[styles.button, styles.testButton]}
                onPress={scheduleTestNotification}
              >
                <Text style={styles.buttonText}>5秒後に通知（テスト）</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* PDF共有 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PDF共有</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={handleSharePDF}
          >
            <Text style={styles.buttonText}>PDFを共有</Text>
          </TouchableOpacity>
        </View>

        {/* 車選択 */}
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.push('/cars/select')}
        >
          <Text style={styles.linkText}>車を変更</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
  },
  carName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  carModel: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#f8fafc',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  cardSubtext: {
    fontSize: 14,
    color: '#64748b',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: '#10b981',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successText: {
    color: '#10b981',
    fontSize: 14,
    marginBottom: 8,
  },
  linkButton: {
    marginTop: 8,
    alignItems: 'center',
  },
  linkText: {
    color: '#2563eb',
    fontSize: 14,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 48,
  },
});
