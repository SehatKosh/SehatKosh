import { useState } from "react";
import { Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Text, TouchableOpacity, View } from "react-native";

export function DosageItem({ time, drug, instruction }: { time: string; drug: string; instruction: string }) { const [done, setDone] = useState(false); const toggle = () => { Haptics.selectionAsync(); setDone((value) => !value); }; return <TouchableOpacity onPress={toggle} className="mb-3 flex-row items-center rounded-2xl border border-slate-200 bg-white p-4"><View className="mr-3 rounded-lg bg-slate-100 px-2 py-1"><Text className="text-xs font-bold text-slate-600">{time}</Text></View><View className="flex-1"><Text className={`text-sm font-bold text-slate-900 ${done ? "line-through" : ""}`}>{drug}</Text><Text className="mt-1 text-xs text-slate-500">{instruction}</Text></View><View className={`h-7 w-7 items-center justify-center rounded-full border ${done ? "border-emerald-500 bg-emerald-500" : "border-slate-300"}`}>{done && <Check color="#FFFFFF" size={16} />}</View></TouchableOpacity>; }
