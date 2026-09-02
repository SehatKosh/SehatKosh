import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { Image as ImageIcon, X, Zap, ZapOff } from "lucide-react-native";
import { useRef, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

export default function ScanDocumentScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState(false);
  const capture = async () => { if (!permission?.granted) { await requestPermission(); return; } const result = await cameraRef.current?.takePictureAsync({ quality: 0.8 }); if (result?.uri) router.push({ pathname: "/intake/ocr-verify", params: { imageUri: result.uri } }); };
  const pick = async () => { const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 }); if (!result.canceled && result.assets[0]) router.push({ pathname: "/intake/ocr-verify", params: { imageUri: result.assets[0].uri } }); };
  if (!permission?.granted) return <View className="flex-1 items-center justify-center bg-slate-950 px-8"><Text className="text-center text-xl font-bold text-white">Camera access is needed</Text><Text className="mt-2 text-center text-sm leading-5 text-slate-400">Allow camera access to scan a prescription or lab report.</Text><TouchableOpacity onPress={requestPermission} className="mt-6 rounded-xl bg-sky-600 px-6 py-4"><Text className="font-bold text-white">Allow camera</Text></TouchableOpacity></View>;
  return <View className="flex-1 bg-black"><CameraView ref={cameraRef} facing="back" enableTorch={flash} className="flex-1"><View className="flex-1 justify-between px-5 pb-10 pt-14"><View className="flex-row items-center justify-between"><TouchableOpacity onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full bg-black/40"><X color="#FFFFFF" size={22} /></TouchableOpacity><Text className="font-bold text-white">Scan document</Text><View className="w-11" /></View><View className="items-center"><View className="h-72 w-56 rounded-2xl border-2 border-dashed border-white" /><Text className="mt-4 rounded-full bg-black/50 px-4 py-2 text-sm text-white">Align the document inside the box</Text></View><View className="flex-row items-center justify-between"><TouchableOpacity onPress={pick} className="h-12 w-12 items-center justify-center rounded-full bg-black/50"><ImageIcon color="#FFFFFF" size={22} /></TouchableOpacity><TouchableOpacity onPress={capture} className="h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white bg-white/20"><View className="h-14 w-14 rounded-full bg-white" /></TouchableOpacity><TouchableOpacity onPress={() => setFlash((value) => !value)} className="h-12 w-12 items-center justify-center rounded-full bg-black/50">{flash ? <Zap color="#F59E0B" size={22} /> : <ZapOff color="#FFFFFF" size={22} />}</TouchableOpacity></View></View></CameraView></View>;
}
