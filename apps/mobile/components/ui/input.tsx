import { TextInput, TextInputProps } from "react-native";

export function Input({ className = "", ...props }: TextInputProps & { className?: string }) { return <TextInput {...props} placeholderTextColor={props.placeholderTextColor ?? "#94A3B8"} className={`rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 ${className}`} />; }
