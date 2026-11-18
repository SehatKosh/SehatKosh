import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Clock,
  CloudOff,
  Droplets,
  Plus,
  RefreshCw,
  Ruler,
  Search,
  ShieldCheck,
  Weight,
} from "lucide-react-native";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { usePatient } from "../../context/PatientContext";
import {
  ClinicalEncounter,
  MOCK_RECORDS,
  groupByMonth,
} from "../../services/mockRecords";
import {
  DEFAULT_PATIENT_ID,
  getPatientEncounters,
} from "../../services/apiClient";
import {
  OfflineScanItem,
  getOfflineQueue,
  startAutoSyncListener,
} from "../../services/offlineQueue";
import { Allergy, AllergyModal, AllergyModalHandle } from "../../components/AllergyModal";

export default function RecordsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { patient } = usePatient();

  const [activeTab, setActiveTab] = useState<"history" | "profile">("history");
  const [search, setSearch] = useState("");
  const allergyModalRef = useRef<AllergyModalHandle>(null);

  const [encounters, setEncounters] = useState<ClinicalEncounter[]>(MOCK_RECORDS);
  const [offlineQueue, setOfflineQueue] = useState<OfflineScanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLiveSync, setIsLiveSync] = useState(false);

  const [allergies, setAllergies] = useState<(Allergy & { id: string })[]>([
    { id: "a1", allergen: "Penicillin", reaction: "Severe Anaphylaxis", severity: "Severe" },
    { id: "a2", allergen: "Sulfa Drugs", reaction: "Cutaneous Rash", severity: "Moderate" },
  ]);

  const loadEncounters = useCallback(async (isPull = false) => {
    if (isPull) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const queue = await getOfflineQueue();
      setOfflineQueue(queue);

      const patientId = DEFAULT_PATIENT_ID;
      const liveList = await getPatientEncounters(patientId);
      if (liveList && liveList.length > 0) {
        const liveIds = new Set(liveList.map((e) => e.id));
        const merged = [...liveList, ...MOCK_RECORDS.filter((m) => !liveIds.has(m.id))];
        setEncounters(merged);
        setIsLiveSync(true);
      } else {
        setEncounters(MOCK_RECORDS);
      }
    } catch {
      setEncounters(MOCK_RECORDS);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadEncounters();
  }, [loadEncounters]);

  useEffect(() => {
    const unsubscribe = startAutoSyncListener(() => {
      getOfflineQueue().then(setOfflineQueue);
      loadEncounters();
    });
    return () => unsubscribe();
  }, [loadEncounters]);

  const handleAddAllergy = (allergy: Allergy) => {
    setAllergies((prev) => [
      ...prev,
      { ...allergy, id: String(Date.now()) },
    ]);
  };

  const groupedRecords = groupByMonth(encounters);

  const filteredGroups = search.trim()
    ? groupedRecords
        .map(({ month, encounters: groupEncounters }) => ({
          month,
          encounters: groupEncounters.filter(
            (e) =>
              e.doctor.toLowerCase().includes(search.toLowerCase()) ||
              e.specialty.toLowerCase().includes(search.toLowerCase()) ||
              e.facility.toLowerCase().includes(search.toLowerCase())
          ),
        }))
        .filter(({ encounters: groupEncounters }) => groupEncounters.length > 0)
    : groupedRecords;

  const topPadding = Math.max(insets.top, 16);

  return (
    <View style={[styles.rootContainer, { backgroundColor: colors.canvas }]}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: topPadding, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadEncounters(true)}
            tintColor={colors.tabBarActive}
            colors={[colors.tabBarActive]}
          />
        }
      >
        {/* ── Page Header ──────────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <View>
            <Text
              style={[
                styles.titleText,
                { color: colors.textPrimary },
              ]}
            >
              Records
            </Text>
            <Text
              style={[
                styles.subtitleText,
                { color: colors.textSecondary },
              ]}
            >
              Clinical history and health profile
            </Text>
          </View>

          {isLiveSync && (
            <View
              style={[
                styles.syncBadge,
                {
                  backgroundColor: isDark
                    ? "rgba(16, 185, 129, 0.15)"
                    : "#ECFDF5",
                  borderColor: isDark ? "#059669" : "#A7F3D0",
                },
              ]}
            >
              <View style={styles.syncDot} />
              <Text style={styles.syncBadgeText}>Live</Text>
            </View>
          )}
        </View>

        {/* ── Segment Toggle ───────────────────────────────────────────── */}
        <View
          style={[
            styles.segmentContainer,
            {
              backgroundColor: isDark ? "#141822" : "#E2E8F0",
              borderColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => setActiveTab("history")}
            activeOpacity={0.8}
            style={[
              styles.segmentBtn,
              activeTab === "history" && [
                styles.segmentBtnActive,
                {
                  backgroundColor: isDark ? "#1E2536" : "#FFFFFF",
                  borderColor: isDark ? colors.border : "#CBD5E1",
                },
              ],
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    activeTab === "history"
                      ? colors.textPrimary
                      : colors.textSecondary,
                  fontWeight: activeTab === "history" ? "700" : "500",
                },
              ]}
            >
              Clinical History
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("profile")}
            activeOpacity={0.8}
            style={[
              styles.segmentBtn,
              activeTab === "profile" && [
                styles.segmentBtnActive,
                {
                  backgroundColor: isDark ? "#1E2536" : "#FFFFFF",
                  borderColor: isDark ? colors.border : "#CBD5E1",
                },
              ],
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    activeTab === "profile"
                      ? colors.textPrimary
                      : colors.textSecondary,
                  fontWeight: activeTab === "profile" ? "700" : "500",
                },
              ]}
            >
              Health Profile
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Tab 1: Clinical History ──────────────────────────────────── */}
        {activeTab === "history" ? (
          <>
            {/* Search Input */}
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Search size={18} color={colors.textSecondary} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search doctor, hospital, condition..."
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.searchInput,
                  { color: colors.textPrimary },
                ]}
              />
            </View>

            {/* Offline Sync Banner if items in queue */}
            {offlineQueue.length > 0 && (
              <View
                style={[
                  styles.offlineBanner,
                  {
                    backgroundColor: isDark
                      ? "rgba(245, 158, 11, 0.15)"
                      : "#FFFBEB",
                    borderColor: isDark ? "#D97706" : "#FDE68A",
                  },
                ]}
              >
                <CloudOff size={16} color="#F59E0B" />
                <Text
                  style={[
                    styles.offlineText,
                    { color: isDark ? "#FCD34D" : "#B45309" },
                  ]}
                >
                  {offlineQueue.length} document(s) queued for offline sync
                </Text>
              </View>
            )}

            {/* Encounters List Grouped by Month */}
            {filteredGroups.map(({ month, encounters: groupList }) => (
              <View key={month} style={styles.monthSection}>
                <Text
                  style={[
                    styles.monthTitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {month}
                </Text>

                {groupList.map((encounter) => (
                  <TouchableOpacity
                    key={encounter.id}
                    onPress={() =>
                      router.push({
                        pathname: "/sessions/[id]",
                        params: { id: encounter.id },
                      })
                    }
                    activeOpacity={0.75}
                    style={[
                      styles.encounterCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.cardDoctorMeta}>
                        <Text
                          style={[
                            styles.doctorName,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {encounter.doctor}
                        </Text>
                        <Text
                          style={[
                            styles.facilityName,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {encounter.facility}
                        </Text>
                      </View>

                      <View style={styles.cardSpecialtyCol}>
                        <Text
                          style={[
                            styles.dateText,
                            { color: colors.textMuted },
                          ]}
                        >
                          {encounter.date}
                        </Text>
                        <View
                          style={[
                            styles.specialtyBadge,
                            {
                              backgroundColor: isDark ? "#1C2230" : "#F1F5F9",
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.specialtyText,
                              { color: colors.tabBarActive },
                            ]}
                          >
                            {encounter.specialty}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Tags */}
                    <View style={styles.tagRow}>
                      {encounter.tags.map((tag) => (
                        <View
                          key={tag.label}
                          style={[
                            styles.tagBadge,
                            {
                              backgroundColor: isDark
                                ? "rgba(56, 189, 248, 0.12)"
                                : "#F0F9FF",
                              borderColor: isDark
                                ? "rgba(56, 189, 248, 0.3)"
                                : "#BAE6FD",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.tagText,
                              {
                                color: isDark
                                  ? "#7DD3FC"
                                  : "#0369A1",
                              },
                            ]}
                          >
                            {tag.label}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Summary */}
                    <Text
                      style={[
                        styles.summaryText,
                        { color: colors.textSecondary },
                      ]}
                      numberOfLines={2}
                    >
                      {encounter.summary}
                    </Text>

                    {/* Action link */}
                    <View style={styles.viewRecordRow}>
                      <Text
                        style={[
                          styles.viewRecordText,
                          { color: colors.tabBarActive },
                        ]}
                      >
                        View Full Record
                      </Text>
                      <ChevronRight size={14} color={colors.tabBarActive} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </>
        ) : (
          /* ── Tab 2: Health Profile ─────────────────────────────────── */
          <View style={styles.profileTabWrapper}>
            {/* Patient Header Card */}
            <View
              style={[
                styles.profileHeaderCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.profileAvatarRow}>
                <View
                  style={[
                    styles.avatarCircle,
                    {
                      backgroundColor: isDark ? "#1E293B" : "#E0F2FE",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.avatarInitials,
                      { color: colors.tabBarActive },
                    ]}
                  >
                    {patient.initials}
                  </Text>
                </View>

                <View>
                  <Text
                    style={[
                      styles.patientFullName,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {patient.fullName}
                  </Text>
                  <Text
                    style={[
                      styles.patientMeta,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {patient.gender} • {patient.age} yrs • UHID: {patient.uhid}
                  </Text>
                </View>
              </View>
            </View>

            {/* Demographics Grid */}
            <View style={styles.vitalsRow}>
              <View
                style={[
                  styles.vitalsCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Droplets size={20} color="#EF4444" />
                <Text
                  style={[
                    styles.vitalsLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Blood Group
                </Text>
                <Text
                  style={[
                    styles.vitalsValue,
                    { color: colors.textPrimary },
                  ]}
                >
                  {patient.bloodGroup}
                </Text>
              </View>

              <View
                style={[
                  styles.vitalsCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Weight size={20} color="#3B82F6" />
                <Text
                  style={[
                    styles.vitalsLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Weight
                </Text>
                <Text
                  style={[
                    styles.vitalsValue,
                    { color: colors.textPrimary },
                  ]}
                >
                  74.5 kg
                </Text>
              </View>
            </View>

            {/* Allergies & Sensitivities */}
            <View style={styles.sectionHeaderRow}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.textPrimary },
                ]}
              >
                Documented Allergies
              </Text>
              <TouchableOpacity
                onPress={() => allergyModalRef.current?.snapToIndex(0)}
                activeOpacity={0.7}
                style={[
                  styles.addAllergyBtn,
                  {
                    backgroundColor: isDark ? "#1C2230" : "#F0F9FF",
                    borderColor: colors.border,
                  },
                ]}
              >
                <Plus size={13} color={colors.tabBarActive} />
                <Text
                  style={[
                    styles.addAllergyText,
                    { color: colors.tabBarActive },
                  ]}
                >
                  Add Allergy
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.allergiesGrid}>
              {allergies.map((allergy) => (
                <View
                  key={allergy.id}
                  style={[
                    styles.allergyCard,
                    {
                      backgroundColor:
                        allergy.severity === "Severe"
                          ? isDark
                            ? "rgba(239, 68, 68, 0.15)"
                            : "#FEF2F2"
                          : isDark
                          ? "rgba(245, 158, 11, 0.15)"
                          : "#FFFBEB",
                      borderColor:
                        allergy.severity === "Severe" ? "#F87171" : "#FCD34D",
                    },
                  ]}
                >
                  <View style={styles.allergyTitleRow}>
                    <Text
                      style={[
                        styles.allergyName,
                        {
                          color:
                            allergy.severity === "Severe"
                              ? "#EF4444"
                              : "#D97706",
                        },
                      ]}
                    >
                      {allergy.allergen}
                    </Text>
                    <Text
                      style={[
                        styles.allergySeverity,
                        {
                          color:
                            allergy.severity === "Severe"
                              ? "#EF4444"
                              : "#D97706",
                        },
                      ]}
                    >
                      {allergy.severity}
                    </Text>
                  </View>
                  {allergy.reaction ? (
                    <Text
                      style={[
                        styles.allergyReaction,
                        {
                          color:
                            allergy.severity === "Severe"
                              ? "#F87171"
                              : "#B45309",
                        },
                      ]}
                    >
                      {allergy.reaction}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>

            {/* Active Regimen / Medications */}
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.textPrimary, marginTop: 20 },
              ]}
            >
              Active Medications
            </Text>
            <View style={styles.medicationsList}>
              {patient.activeMedications.map((med) => (
                <View
                  key={med.name}
                  style={[
                    styles.medicationRow,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.medIconPill}>
                    <Activity size={18} color={colors.tabBarActive} />
                  </View>
                  <View style={styles.medMeta}>
                    <Text
                      style={[
                        styles.medName,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {med.name} {med.dosage}
                    </Text>
                    <Text
                      style={[
                        styles.medFreq,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {med.frequency} • {med.timeOfDay}
                    </Text>
                  </View>
                  <ShieldCheck size={18} color="#10B981" />
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Unmountable Allergy Modal ───────────────────────────────── */}
      <AllergyModal ref={allergyModalRef} onSave={handleAddAllergy} />
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  titleText: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  syncBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  syncBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#10B981",
  },
  segmentContainer: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  segmentBtnActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: "600",
  },
  monthSection: {
    marginBottom: 20,
    gap: 10,
  },
  monthTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  encounterCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardDoctorMeta: {
    flex: 1,
    marginRight: 10,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: "700",
  },
  facilityName: {
    fontSize: 12,
    marginTop: 2,
  },
  cardSpecialtyCol: {
    alignItems: "flex-end",
    gap: 4,
  },
  dateText: {
    fontSize: 11,
  },
  specialtyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
  },
  specialtyText: {
    fontSize: 10,
    fontWeight: "700",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 19,
  },
  viewRecordRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
    marginTop: 4,
  },
  viewRecordText: {
    fontSize: 12,
    fontWeight: "700",
  },
  profileTabWrapper: {
    gap: 14,
  },
  profileHeaderCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  profileAvatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: "700",
  },
  patientFullName: {
    fontSize: 18,
    fontWeight: "700",
  },
  patientMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  vitalsRow: {
    flexDirection: "row",
    gap: 12,
  },
  vitalsCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  vitalsLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
  vitalsValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  addAllergyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
  },
  addAllergyText: {
    fontSize: 11,
    fontWeight: "700",
  },
  allergiesGrid: {
    gap: 8,
  },
  allergyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  allergyTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  allergyName: {
    fontSize: 13,
    fontWeight: "700",
  },
  allergySeverity: {
    fontSize: 11,
    fontWeight: "700",
  },
  allergyReaction: {
    fontSize: 11,
  },
  medicationsList: {
    gap: 8,
  },
  medicationRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  medIconPill: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  medMeta: {
    flex: 1,
  },
  medName: {
    fontSize: 13,
    fontWeight: "700",
  },
  medFreq: {
    fontSize: 11,
    marginTop: 2,
  },
});
