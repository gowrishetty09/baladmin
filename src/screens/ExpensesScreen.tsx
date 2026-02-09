import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FilterDropdown } from "../components/FilterDropdown";
import { Colors } from "../constants/colors";
import ApiService from "../services/api";
import { Expense, ExpenseStatus } from "../types";
import { formatDate } from "../utils";
import { getErrorMessage } from "../utils";
import { showErrorToast, showSuccessToast } from "../utils/toast";
import { useThemeContext } from "../hooks/ThemeContext";

type ActionType = "APPROVED" | "REJECTED";

const parseDateInput = (
  value: string,
  kind: "start" | "end"
): string | undefined => {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return undefined;

  // Accept YYYY-MM-DD
  const isoCandidate =
    trimmed.length === 10 ? `${trimmed}T00:00:00.000Z` : trimmed;
  const d = new Date(isoCandidate);
  if (Number.isNaN(d.getTime())) return undefined;

  if (kind === "start") {
    const start = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)
    );
    return start.toISOString();
  }

  const end = new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );
  return end.toISOString();
};

const statusLabel = (status: ExpenseStatus) => {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    default:
      return status;
  }
};

const typeLabel = (value: Expense["expenseType"]) => {
  switch (value) {
    case "FUEL":
      return "Fuel";
    case "TOLL":
      return "Toll";
    case "OTHER":
      return "Other";
    default:
      return value;
  }
};

export const ExpensesScreen: React.FC = () => {
  const { isDark } = useThemeContext();
  const insets = useSafeAreaInsets();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<ExpenseStatus | "">("");
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [startDateText, setStartDateText] = useState("");
  const [endDateText, setEndDateText] = useState("");

  // Action modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalExpense, setModalExpense] = useState<Expense | null>(null);
  const [modalAction, setModalAction] = useState<ActionType>("APPROVED");
  const [adminComment, setAdminComment] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const driverOptions = useMemo(() => {
    const unique = new Map<string, string>();
    for (const exp of expenses) {
      const id = String(exp.driverId ?? exp.driver?.id ?? "");
      const name = String(exp.driver?.name ?? "");
      if (id && name && !unique.has(id)) {
        unique.set(id, name);
      }
    }
    return [
      { label: "All Drivers", value: "" },
      ...Array.from(unique.entries())
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([id, name]) => ({ label: name, value: id })),
    ];
  }, [expenses]);

  const statusOptions = useMemo(
    () => [
      { label: "All Status", value: "" },
      { label: "Pending", value: "PENDING" },
      { label: "Approved", value: "APPROVED" },
      { label: "Rejected", value: "REJECTED" },
    ],
    []
  );

  const loadExpenses = async () => {
    try {
      setIsLoading(true);
      const startDate = parseDateInput(startDateText, "start");
      const endDate = parseDateInput(endDateText, "end");

      const response = await ApiService.getAdminExpenses({
        status: (selectedStatus || undefined) as any,
        driverId: selectedDriver || undefined,
        startDate,
        endDate,
        limit: 100,
        offset: 0,
      });

      setExpenses(response.data);
    } catch (error) {
      showErrorToast(
        "Expenses",
        getErrorMessage(error, "Failed to load expenses")
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadExpenses();
    setIsRefreshing(false);
  };

  const clearFilters = () => {
    setSelectedStatus("");
    setSelectedDriver("");
    setStartDateText("");
    setEndDateText("");
  };

  const openActionModal = (expense: Expense, action: ActionType) => {
    setModalExpense(expense);
    setModalAction(action);
    setAdminComment("");
    setModalVisible(true);
  };

  const applyOptimisticUpdate = (
    expenseId: string,
    nextStatus: ExpenseStatus,
    nextComment?: string
  ) => {
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === expenseId
          ? {
              ...e,
              status: nextStatus,
              adminComment: nextComment ?? e.adminComment,
            }
          : e
      )
    );
  };

  const handleConfirmAction = async () => {
    if (!modalExpense) return;

    const expenseId = modalExpense.id;
    const previous = modalExpense;

    setProcessingId(expenseId);
    setModalVisible(false);

    const nextStatus: ExpenseStatus = modalAction;
    applyOptimisticUpdate(
      expenseId,
      nextStatus,
      adminComment.trim() || undefined
    );

    try {
      await ApiService.updateAdminExpense(expenseId, {
        status: modalAction,
        adminComment: adminComment.trim() || undefined,
      });
      showSuccessToast(
        "Expenses",
        `Expense ${modalAction === "APPROVED" ? "approved" : "rejected"}`
      );
    } catch (error) {
      // Revert
      setExpenses((prev) =>
        prev.map((e) => (e.id === expenseId ? previous : e))
      );
      showErrorToast(
        "Expenses",
        getErrorMessage(error, "Failed to update expense")
      );
    } finally {
      setProcessingId(null);
      setModalExpense(null);
      setAdminComment("");
    }
  };

  const renderCard = ({ item }: { item: Expense }) => {
    const isPending = item.status === "PENDING";
    const disabled = processingId === item.id;

    return (
      <View style={[styles.card, { backgroundColor: isDark ? '#2A2A2A' : Colors.white }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardDriverInfo}>
            <View style={[styles.cardAvatar, { backgroundColor: Colors.gold + '30' }]}>
              <Ionicons name="person" size={18} color={Colors.gold} />
            </View>
            <View>
              <Text style={[styles.cardDriverName, { color: isDark ? Colors.ivory : Colors.navy }]}>
                {item.driver?.name ?? "Unknown Driver"}
              </Text>
              <Text style={[styles.cardDate, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>
                {formatDate(item.date)}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.statusPill,
              item.status === "PENDING" && styles.statusPending,
              item.status === "APPROVED" && styles.statusApproved,
              item.status === "REJECTED" && styles.statusRejected,
            ]}
          >
            <Text style={[
              styles.statusText,
              item.status === "PENDING" && { color: Colors.warning },
              item.status === "APPROVED" && { color: Colors.success },
              item.status === "REJECTED" && { color: Colors.sos },
            ]}>{statusLabel(item.status)}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            <View style={styles.cardField}>
              <Text style={[styles.cardLabel, { color: isDark ? Colors.ivory + '66' : Colors.navy + '66' }]}>Type</Text>
              <View style={[styles.typeBadge, { backgroundColor: isDark ? Colors.gold + '20' : Colors.gold + '15' }]}>
                <Ionicons 
                  name={item.expenseType === 'FUEL' ? 'car' : item.expenseType === 'TOLL' ? 'navigate' : 'receipt'} 
                  size={14} 
                  color={Colors.gold} 
                />
                <Text style={[styles.typeText, { color: isDark ? Colors.ivory : Colors.navy }]}>
                  {typeLabel(item.expenseType)}
                </Text>
              </View>
            </View>
            <View style={[styles.cardField, styles.cardFieldAmount]}>
              <Text style={[styles.cardLabel, { color: isDark ? Colors.ivory + '66' : Colors.navy + '66' }]}>Amount</Text>
              <Text style={[styles.cardAmount, { color: isDark ? Colors.ivory : Colors.navy }]}>
                RM {Number(item.amount ?? 0).toFixed(2)}
              </Text>
            </View>
          </View>

          {item.description ? (
            <View style={styles.cardDescriptionContainer}>
              <Text style={[styles.cardLabel, { color: isDark ? Colors.ivory + '66' : Colors.navy + '66' }]}>Description</Text>
              <Text style={[styles.cardDescription, { color: isDark ? Colors.ivory : Colors.navy }]} numberOfLines={2}>
                {item.description}
              </Text>
            </View>
          ) : null}
        </View>

        {isPending && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[
                styles.cardActionBtn,
                styles.approveBtn,
                disabled && styles.disabledBtn,
              ]}
              disabled={disabled}
              onPress={() => openActionModal(item, "APPROVED")}
            >
              {disabled ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
                  <Text style={styles.cardActionText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.cardActionBtn,
                styles.rejectBtn,
                disabled && styles.disabledBtn,
              ]}
              disabled={disabled}
              onPress={() => openActionModal(item, "REJECTED")}
            >
              {disabled ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={18} color={Colors.white} />
                  <Text style={styles.cardActionText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {item.adminComment && (
          <View style={[styles.cardComment, { backgroundColor: isDark ? '#1A1A1A' : Colors.borderLight }]}>
            <Ionicons name="chatbubble" size={14} color={isDark ? Colors.ivory + '80' : Colors.navy + '80'} />
            <Text style={[styles.cardCommentText, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]} numberOfLines={2}>
              {item.adminComment}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const hasActiveFilters = Boolean(
    selectedStatus || selectedDriver || startDateText || endDateText
  );

  const pendingCount = expenses.filter((e) => e.status === "PENDING").length;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.navy : '#F5F7FA' }]}>
      {/* Modern Header */}
      <LinearGradient
        colors={isDark ? [Colors.navy, Colors.navy + 'EE'] : [Colors.navy, '#1E3A5F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Expenses</Text>
            <Text style={styles.headerSubtitle}>
              {pendingCount > 0 ? `${pendingCount} pending approval` : 'All caught up!'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.filterButton, showFilters && styles.filterButtonActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons
              name={showFilters ? "close" : "options-outline"}
              size={22}
              color={Colors.white}
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {showFilters && (
        <View style={[styles.filtersContainer, { backgroundColor: isDark ? '#2A2A2A' : Colors.white }]}>
          <FilterDropdown
            label="Status"
            value={selectedStatus}
            options={statusOptions}
            onSelect={(value) => setSelectedStatus(value as ExpenseStatus | "")}
            placeholder="All Status"
          />

          <FilterDropdown
            label="Driver"
            value={selectedDriver}
            options={driverOptions}
            onSelect={setSelectedDriver}
            placeholder="All Drivers"
          />

          <Text style={[styles.filterLabel, { color: isDark ? Colors.ivory + '99' : Colors.navy + '99' }]}>Date Range (YYYY-MM-DD)</Text>
          <View style={styles.dateRow}>
            <TextInput
              style={[styles.dateInput, { backgroundColor: isDark ? '#1A1A1A' : Colors.borderLight, color: isDark ? Colors.ivory : Colors.navy }]}
              placeholder="Start"
              placeholderTextColor={isDark ? Colors.ivory + '66' : Colors.navy + '66'}
              value={startDateText}
              onChangeText={setStartDateText}
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.dateInput, { backgroundColor: isDark ? '#1A1A1A' : Colors.borderLight, color: isDark ? Colors.ivory : Colors.navy }]}
              placeholder="End"
              placeholderTextColor={isDark ? Colors.ivory + '66' : Colors.navy + '66'}
              value={endDateText}
              onChangeText={setEndDateText}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.filterActionsRow}>
            <TouchableOpacity style={styles.applyButton} onPress={loadExpenses}>
              <Ionicons name="search" size={18} color={Colors.white} />
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>

            {hasActiveFilters && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearFilters}
              >
                <Ionicons name="refresh" size={18} color={Colors.white} />
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={isDark ? Colors.gold : Colors.navy}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator color={isDark ? Colors.gold : Colors.navy} />
              <Text style={[styles.emptyText, { color: isDark ? Colors.ivory : Colors.navy }]}>Loading expenses...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={48} color={isDark ? Colors.ivory + '40' : Colors.navy + '40'} />
              <Text style={[styles.emptyText, { color: isDark ? Colors.ivory : Colors.navy }]}>No expenses found</Text>
            </View>
          )
        }
      />

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalAction === "APPROVED"
                  ? "Approve expense"
                  : "Reject expense"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.navy} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalBodyText}>
              {modalExpense?.driver?.name ?? "Driver"} •{" "}
              {modalExpense ? typeLabel(modalExpense.expenseType) : ""} • RM{" "}
              {modalExpense ? Number(modalExpense.amount).toFixed(2) : ""}
            </Text>

            <Text style={styles.modalLabel}>Admin comment (optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Add a comment (optional)"
              placeholderTextColor={Colors.navy + "66"}
              value={adminComment}
              onChangeText={setAdminComment}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  modalAction === "APPROVED"
                    ? styles.modalApprove
                    : styles.modalReject,
                ]}
                onPress={handleConfirmAction}
              >
                <Text style={styles.modalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.white,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.gold,
    fontWeight: "500",
    marginTop: 4,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.white + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: Colors.gold,
  },
  filtersContainer: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.white,
    borderRadius: 16,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.navy + "99",
    marginBottom: 8,
    marginTop: 12,
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  dateInput: {
    flex: 1,
    backgroundColor: Colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: Colors.navy,
    fontSize: 14,
  },
  filterActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  applyButton: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.navy,
    borderRadius: 12,
    paddingVertical: 14,
  },
  applyButtonText: {
    color: Colors.white,
    fontWeight: "700",
  },
  clearButton: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
  },
  clearButtonText: {
    color: Colors.white,
    fontWeight: "700",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 132,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight + '40',
  },
  cardDriverInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardDriverName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.navy,
  },
  cardDate: {
    fontSize: 12,
    color: Colors.navy + '80',
    marginTop: 2,
  },
  cardBody: {
    padding: 14,
    paddingTop: 12,
  },
  cardRow: {
    flexDirection: "row",
    gap: 16,
  },
  cardField: {
    flex: 1,
  },
  cardFieldAmount: {
    alignItems: "flex-end",
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.navy + '66',
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  typeText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.navy,
  },
  cardAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.navy,
  },
  cardDescriptionContainer: {
    marginTop: 12,
  },
  cardDescription: {
    fontSize: 13,
    color: Colors.navy,
    lineHeight: 18,
  },
  cardActions: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    paddingTop: 0,
  },
  cardActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cardActionText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
  cardComment: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 10,
    borderRadius: 10,
  },
  cardCommentText: {
    flex: 1,
    fontSize: 12,
  },
  tableWrap: {
    padding: 16,
    paddingBottom: 32,
  },
  tableHeaderRow: {
    backgroundColor: Colors.gold + "22",
    borderRadius: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
  },
  rowLight: {
    backgroundColor: Colors.white,
  },
  headerCell: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.navy,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  cell: {
    fontSize: 13,
    color: Colors.navy,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  driverCell: { width: 140 },
  typeCell: { width: 90 },
  amountCell: { width: 110 },
  descCell: { width: 220 },
  dateCell: { width: 120 },
  statusCell: { width: 120 },
  actionsCell: { width: 200 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
    backgroundColor: Colors.borderLight,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.navy,
  },
  statusPending: {
    backgroundColor: Colors.warning + "33",
  },
  statusApproved: {
    backgroundColor: Colors.success + "33",
  },
  statusRejected: {
    backgroundColor: Colors.sos + "22",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 80,
    alignItems: "center",
  },
  approveBtn: {
    backgroundColor: Colors.success,
  },
  rejectBtn: {
    backgroundColor: Colors.sos,
  },
  actionText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: 12,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  muted: {
    color: Colors.navy + "66",
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    marginTop: 8,
    color: Colors.navy,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.navy,
  },
  modalBodyText: {
    paddingHorizontal: 16,
    paddingTop: 12,
    color: Colors.navy,
  },
  modalLabel: {
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    fontWeight: "700",
    color: Colors.navy,
  },
  modalInput: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 90,
    textAlignVertical: "top",
    color: Colors.navy,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalCancel: {
    backgroundColor: Colors.borderLight,
  },
  modalCancelText: {
    color: Colors.navy,
    fontWeight: "700",
  },
  modalApprove: {
    backgroundColor: Colors.success,
  },
  modalReject: {
    backgroundColor: Colors.sos,
  },
  modalConfirmText: {
    color: Colors.white,
    fontWeight: "800",
  },
});
