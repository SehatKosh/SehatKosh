import { PropsWithChildren } from "react";
import { Text, View } from "react-native";

export function Badge({ children, tone = "blue" }: PropsWithChildren<{ tone?: "blue" | "green" | "amber" | "red" | "slate" }>) { const styles = { blue: "bg-sky-50 text-sky-700", green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", red: "bg-red-50 text-red-700", slate: "bg-slate-100 text-slate-700" }; const [background, color] = styles[tone].split(" "); return <View className={`rounded-full px-3 py-1.5 ${background}`}><Text className={`text-xs font-semibold ${color}`}>{children}</Text></View>; }
