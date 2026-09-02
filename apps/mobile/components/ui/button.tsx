import { PropsWithChildren } from "react";
import { Text, TouchableOpacity, TouchableOpacityProps } from "react-native";

export function Button({ children, className = "", ...props }: PropsWithChildren<TouchableOpacityProps & { className?: string }>) { return <TouchableOpacity {...props} className={`items-center justify-center rounded-xl px-4 py-3 ${className}`}><Text className="font-bold text-white">{children}</Text></TouchableOpacity>; }
