import { PropsWithChildren } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";

export function Dialog({ visible, title, onClose, children }: PropsWithChildren<{ visible: boolean; title: string; onClose: () => void }>) { return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}><View className="flex-1 items-center justify-center bg-black/40 px-5"><View className="w-full rounded-2xl bg-white p-5"><View className="flex-row items-center justify-between"><Text className="text-lg font-bold text-slate-900">{title}</Text><TouchableOpacity onPress={onClose}><Text className="text-sm font-semibold text-sky-600">Close</Text></TouchableOpacity></View>{children}</View></View></Modal>; }
