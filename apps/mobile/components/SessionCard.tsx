import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { Badge } from "./ui/badge";

export function SessionCard({ id = "medrx-001" }: { id?: string }) { return <TouchableOpacity onPress={() => router.push(`/sessions/${id}`)} className="rounded-2xl border border-slate-200 bg-white p-4"><View className="flex-row justify-between"><Text className="font-bold text-slate-900">Dr. Tariq Khan</Text><Text className="text-xs text-slate-400">Aug 30, 2026</Text></View><Text className="mt-2 text-sm text-slate-500">Shifa International · Cardiology</Text><View className="mt-4 flex-row gap-2"><Badge>Prescription: 2 drugs</Badge><Badge tone="green">Document attached</Badge></View><Text numberOfLines={2} className="mt-4 text-sm leading-5 text-slate-600">Follow-up consultation with updated medication instructions and hydration guidance.</Text></TouchableOpacity>; }
