import { useState } from "react";
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Camera } from "lucide-react-native";

export default function ScanScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      processOCR();
    }
  };

  const processOCR = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
    }, 2500);
  };

  return (
    <View className="flex-1 bg-slate-50 p-6 pt-14 items-center">
      <Text className="text-2xl font-bold text-slate-900 mb-2">Prescription OCR</Text>
      <Text className="text-slate-500 text-center mb-8">
        Capture medical prescription to extract structured FHIR records
      </Text>

      {imageUri ? (
        <View className="w-full aspect-[3/4] bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6 relative">
          <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode="cover" />
          {processing && (
            <View className="absolute inset-0 bg-black/50 justify-center items-center">
              <ActivityIndicator size="large" color="#ffffff" />
              <Text className="text-white font-medium mt-3">Extracting Entities & Standardizing...</Text>
            </View>
          )}
        </View>
      ) : (
        <View className="w-full aspect-[3/4] bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 justify-center items-center mb-6">
          <Camera size={48} color="#94a3b8" />
          <Text className="text-slate-400 font-medium mt-3">No document captured</Text>
        </View>
      )}

      <TouchableOpacity
        onPress={takePhoto}
        disabled={processing}
        className="w-full bg-blue-600 py-4 rounded-xl items-center flex-row justify-center gap-2 shadow-sm active:bg-blue-700"
      >
        <Camera size={20} color="#ffffff" />
        <Text className="text-white font-semibold text-base">Open Camera</Text>
      </TouchableOpacity>
    </View>
  );
}
