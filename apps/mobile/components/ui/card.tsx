import { PropsWithChildren } from "react";
import { View, ViewProps } from "react-native";

export function Card({ children, className = "", ...props }: PropsWithChildren<ViewProps & { className?: string }>) { return <View {...props} className={`rounded-2xl border border-slate-200 bg-white p-4 ${className}`}>{children}</View>; }
