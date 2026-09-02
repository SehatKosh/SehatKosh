import { View, Text } from "react-native";

export default function RecordsScreen() {
  return (
    <View className="flex-1 bg-slate-50 p-6 pt-14">
      <Text className="text-3xl font-bold text-slate-900">Records</Text>
      <Text className="mt-1 text-sm text-slate-500">Your clinical history and health profile</Text>
      <View className="mt-6 flex-row rounded-xl bg-slate-200 p-1">
        <TouchableOpacity onPress={() => setProfile(false)} className={`flex-1 rounded-lg py-3 ${!profile ? "bg-white" : ""}`}>
          <Text className="text-center text-sm font-semibold text-slate-700">Clinical History</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setProfile(true)} className={`flex-1 rounded-lg py-3 ${profile ? "bg-white" : ""}`}>
          <Text className="text-center text-sm font-semibold text-slate-700">Health Profile</Text>
        </TouchableOpacity>
      </View>
      {profile ? (
        <>
          <Text className="mb-3 mt-7 text-lg font-bold text-slate-900">Allergies & sensitivities</Text>
          <View className="flex-row flex-wrap gap-3">
            <View className="rounded-full bg-red-50 px-4 py-3">
              <Text className="text-sm font-semibold text-red-600">Penicillin  ·  Severe</Text>
            </View>
            <View className="rounded-full bg-amber-50 px-4 py-3">
              <Text className="text-sm font-semibold text-amber-700">NSAIDs  ·  Mild</Text>
            </View>
          </View>
          <Text className="mb-3 mt-8 text-lg font-bold text-slate-900">Doctor access requests</Text>
          <View className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <View className="flex-row items-center gap-3">
              <ShieldCheck size={22} color="#F59E0B" />
              <View>
                <Text className="font-bold text-slate-900">Dr. Ayesha Malik</Text>
                <Text className="mt-1 text-xs text-slate-600">Cardiology · PIMS Hospital</Text>
              </View>
            </View>
            <Text className="mt-4 text-sm text-slate-700">Full History · 24 Hours Access</Text>
            <View className="mt-4 flex-row gap-3">
              <TouchableOpacity className="flex-1 rounded-xl border border-slate-300 py-3">
                <Text className="text-center text-sm font-semibold text-slate-700">Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 rounded-xl bg-sky-600 py-3">
                <Text className="text-center text-sm font-semibold text-white">Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      ) : (
        <>
          <View className="mt-5 flex-row items-center rounded-xl border border-slate-200 bg-white px-3">
            <Search size={19} color="#94A3B8" />
            <TextInput placeholder="Search doctor, disease, medication..." placeholderTextColor="#94A3B8" className="flex-1 px-3 py-3 text-sm" />
          </View>
          <View className="my-4 flex-row gap-2">
            <Text className="rounded-full bg-sky-100 px-4 py-2 text-xs font-semibold text-sky-700">All</Text>
            <Text className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-500">Doctor Visits</Text>
            <Text className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-500">Prescriptions</Text>
          </View>
          <Text className="mb-3 text-lg font-bold text-slate-900">August 2026</Text>
          <View className="rounded-2xl border border-slate-200 bg-white p-4">
            <View className="flex-row justify-between">
              <Text className="font-bold text-slate-900">Dr. Tariq Khan</Text>
              <Text className="text-xs text-slate-400">Aug 30, 2026</Text>
            </View>
            <Text className="mt-2 text-sm text-slate-500">Shifa International · Cardiology</Text>
            <View className="mt-4 flex-row gap-2">
              <Text className="rounded-full bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">Prescription: 2 drugs</Text>
              <Text className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">Document attached</Text>
            </View>
            <Text className="mt-4 text-sm leading-5 text-slate-600">Follow-up consultation with updated medication instructions and hydration guidance.</Text>
          </View>
        </>
      )}
    </View>
  );
}
