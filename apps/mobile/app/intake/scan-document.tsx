import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { Image as ImageIcon, X, Zap, ZapOff } from "lucide-react-native";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ScanDocumentScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const insets = useSafeAreaInsets();

  const capture = async () => {
    if (!permission?.granted) {
      await requestPermission();
      return;
    }
    if (!isCameraReady || isCapturing) {
      return;
    }

    try {
      setIsCapturing(true);
      const result = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
      if (result?.uri) {
        router.push({ pathname: "/intake/ocr-verify", params: { imageUri: result.uri } });
      }
    } catch (error: any) {
      console.warn("Camera photo capture error:", error);
      Alert.alert("Camera Not Ready", "The camera is still initializing. Please try again in a moment.");
    } finally {
      setIsCapturing(false);
    }
  };

  const pick = async () => {
    if (isCapturing) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0])
      router.push({
        pathname: "/intake/ocr-verify",
        params: { imageUri: result.assets[0].uri },
      });
  };

  if (!permission?.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950 px-8">
        <Text className="text-center text-xl font-bold text-white">
          Camera access is needed
        </Text>
        <Text className="mt-2 text-center text-sm leading-5 text-slate-400">
          Allow camera access to scan a prescription or lab report.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          className="mt-6 rounded-xl bg-sky-600 px-6 py-4"
        >
          <Text className="font-bold text-white">Allow camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* 1. Camera Viewport — fills the entire container */}
      <CameraView
        ref={cameraRef}
        facing="back"
        enableTorch={flash}
        onCameraReady={() => setIsCameraReady(true)}
        style={StyleSheet.absoluteFill}
      />

      {/* 2. Top Controls — dismiss & flash, anchored below status bar */}
      <View
        style={{ paddingTop: insets.top + 8 }}
        className="absolute left-0 right-0 top-0 z-10 flex-row items-center justify-between px-6"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full bg-black/40"
        >
          <X size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="font-bold text-white">Scan document</Text>
        <TouchableOpacity
          onPress={() => setFlash((v) => !v)}
          className="h-11 w-11 items-center justify-center rounded-full bg-black/40"
        >
          {flash ? (
            <Zap size={22} color="#FBBF24" />
          ) : (
            <ZapOff size={22} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* 3. Document framing guide — centered middle layer */}
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-white/70" />
        <Text className="mt-4 rounded-full bg-black/50 px-4 py-2 text-sm font-medium text-white/90">
          Fit prescription or lab report within boundary
        </Text>
      </View>

      {/* 4. Bottom Controls — gallery, shutter, spacer; anchored to viewport bottom */}
      <View
        style={{ paddingBottom: Math.max(insets.bottom, 24) }}
        className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between bg-black/40 px-8 pt-6"
      >
        {/* Gallery picker */}
        <TouchableOpacity
          onPress={pick}
          disabled={isCapturing}
          className="h-12 w-12 items-center justify-center rounded-full bg-white/20"
        >
          <ImageIcon size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Shutter button */}
        <TouchableOpacity
          onPress={capture}
          disabled={!isCameraReady || isCapturing}
          style={{ opacity: !isCameraReady || isCapturing ? 0.6 : 1 }}
          className="h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white bg-transparent"
        >
          {isCapturing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View className="h-14 w-14 rounded-full bg-white" />
          )}
        </TouchableOpacity>

        {/* Spacer balances gallery icon */}
        <View className="h-12 w-12" />
      </View>
    </View>
  );
}
