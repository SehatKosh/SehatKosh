import { PropsWithChildren, ReactNode } from "react";
import { Text, View } from "react-native";

export function VitalsCard({ title, value, unit, icon, footer }: PropsWithChildren<{ title: string; value: string; unit?: string; icon: ReactNode; footer?: ReactNode }>) { return <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-4"><View className="flex-row items-center gap-2">{icon}<Text className="text-sm font-semibold text-slate-600">{title}</Text></View><View className="mt-3 flex-row items-baseline"><Text className="text-3xl font-bold text-slate-900">{value}</Text>{unit && <Text className="ml-1 text-sm text-slate-400">{unit}</Text>}</View><View className="mt-3">{footer}</View></View>; }
