import { View } from "react-native";

export function ActivityGraph({ values = [35, 48, 42, 62, 54, 72, 64, 76, 68, 82, 72, 78] }: { values?: number[] }) { return <View className="h-10 flex-row items-end gap-1">{values.map((value, index) => <View key={index} className="flex-1 rounded-t bg-sky-400" style={{ height: `${value}%` }} />)}</View>; }
