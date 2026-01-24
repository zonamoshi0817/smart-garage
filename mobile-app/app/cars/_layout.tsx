import { Stack } from 'expo-router';

export default function CarsLayout() {
  return (
    <Stack>
      <Stack.Screen name="select" options={{ title: '車を選択' }} />
    </Stack>
  );
}
