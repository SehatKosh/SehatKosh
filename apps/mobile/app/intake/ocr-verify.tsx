import { BottomSheet, BottomSheetTextInput, BottomSheetView } from "@gorhom/bottom-sheet";
import { useLocalSearchParams, router } from "expo-router";
import { AlertTriangle, Check, Plus, Trash2, X } from "lucide-react-native";
import { useRef, useState } from "react";
import { Image, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";

type Medication = { name: string; strength: string; frequency: string; duration: string };

export default function OcrVerifyScreen() {
  const { imageUri } = useLocalSearchParams<{ imageUri?: string }>();
  const sheetRef = useRef<BottomSheet>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([
    { name: "Amoxicillin", strength: "500mg", frequency: "3 times daily", duration: "7 days" },
    { name: "Paracetamol", strength: "500mg", frequency: "As needed", duration: "3 days" },
  ]);

  const expandForInput = () => sheetRef.current?.snapToIndex(2);
  const removeMedication = (index: number) => setMedications((current) => current.filter((_, medicationIndex) => medicationIndex !== index));

  return (
    <View className="flex-1 bg-slate-950">
      <View className="flex-row items-center justify-between px-5 pb-4 pt-14">
        <TouchableOpacity onPress={() => router.back()} className="h-11 w-11 items-center justify-center"><X color="#FFFFFF" size={22} /></TouchableOpacity>
        <Text className="text-base font-bold text-white">Verify extracted details</Text>
        <View className="w-11" />
      </View>
      <Pressable onPress={() => sheetRef.current?.snapToIndex(0)} className="mx-5 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
        {imageUri ? <Image source={{ uri: imageUri }} resizeMode="contain" className="h-full w-full" /> : <View className="items-center px-8"><Text className="text-center text-lg font-semibold text-white">Prescription preview</Text><Text className="mt-2 text-center text-sm leading-5 text-slate-400">Tap and pinch to inspect the captured document.</Text></View>}
        <View className="absolute bottom-4 rounded-full bg-black/70 px-4 py-2"><Text className="text-xs font-semibold text-white">Tap image to collapse form</Text></View>
      </Pressable>
      <BottomSheet ref={sheetRef} index={1} snapPoints={["15%", "50%", "90%"]} enablePanDownToClose={false} backgroundStyle={{ backgroundColor: "#FFFFFF", borderRadius: 24 }} handleIndicatorStyle={{ backgroundColor: "#CBD5E1", width: 48 }}>
        <BottomSheetView className="flex-1">
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <Text className="text-xl font-bold text-slate-900">Extracted medications ({medications.length} detected)</Text>
            <Text className="mt-1 text-sm leading-5 text-slate-500">Review every field against the document before saving.</Text>
            <View className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
              <View className="flex-row items-start"><AlertTriangle color="#DC2626" size={21} /><View className="ml-3 flex-1"><Text className="text-xs font-bold tracking-wide text-red-700">CONTRAINDICATION DETECTED</Text><Text className="mt-1 text-sm leading-5 text-red-700"><Text className="font-bold">Amoxicillin</Text> is a penicillin-class antibiotic. Your profile lists a severe allergy to Penicillin.</Text><View className="mt-3 flex-row gap-2"><TouchableOpacity className="flex-1 rounded-xl border border-red-300 px-2 py-2"><Text className="text-center text-xs font-bold text-red-700">Flag to Doctor</Text></TouchableOpacity><TouchableOpacity onPress={() => removeMedication(0)} className="flex-1 rounded-xl bg-red-600 px-2 py-2"><Text className="text-center text-xs font-bold text-white">Remove Medication</Text></TouchableOpacity></View></View></View>
              <TouchableOpacity onPress={() => setAcknowledged((value) => !value)} className="mt-3 flex-row items-center"><View className={`mr-2 h-5 w-5 items-center justify-center rounded border ${acknowledged ? "border-red-600 bg-red-600" : "border-red-400 bg-white"}`}>{acknowledged && <Check color="#FFFFFF" size={14} />}</View><Text className="flex-1 text-xs font-medium text-red-700">I acknowledge this allergy conflict.</Text></TouchableOpacity>
            </View>
            {medications.map((medication, index) => <View key={`${medication.name}-${index}`} className="mt-4 rounded-2xl border border-slate-200 bg-white p-4"><View className="mb-3 flex-row items-center justify-between"><Text className="text-sm font-bold text-slate-900">Medication {index + 1}</Text><TouchableOpacity accessibilityLabel={`Delete ${medication.name}`} onPress={() => removeMedication(index)} className="h-11 w-11 items-center justify-center"><Trash2 color="#EF4444" size={18} /></TouchableOpacity></View><View className="flex-row gap-2"><BottomSheetTextInput defaultValue={medication.name} onFocus={expandForInput} className="flex-1 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-900" placeholder="Drug name" /><BottomSheetTextInput defaultValue={medication.strength} onFocus={expandForInput} className="w-24 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-900" placeholder="Strength" /></View><BottomSheetTextInput defaultValue={medication.frequency} onFocus={expandForInput} className="mt-2 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-900" placeholder="Frequency / timing" /><BottomSheetTextInput defaultValue={medication.duration} onFocus={expandForInput} className="mt-2 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-900" placeholder="Duration" /></View>)}
            <TouchableOpacity onPress={() => setMedications((current) => [...current, { name: "", strength: "", frequency: "", duration: "" }])} className="mt-4 flex-row items-center justify-center rounded-xl border border-sky-200 py-3"><Plus color="#0284C7" size={18} /><Text className="ml-2 text-sm font-bold text-sky-700">Add medication manually</Text></TouchableOpacity>
            <TouchableOpacity disabled={!acknowledged} onPress={() => Alert.alert("Saved", "The verified medication list was added to your records.")} className={`mt-3 rounded-xl py-4 ${acknowledged ? "bg-sky-600" : "bg-slate-200"}`}><Text className={`text-center text-sm font-bold ${acknowledged ? "text-white" : "text-slate-400"}`}>Confirm & Save</Text></TouchableOpacity>
          </ScrollView>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}
