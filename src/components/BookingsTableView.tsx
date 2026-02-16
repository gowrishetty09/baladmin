import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Booking, BookingStatus } from "../types";
import { Colors } from "../constants/colors";

// ── helpers ──────────────────────────────────────────────────
const SCREEN_WIDTH = Dimensions.get("window").width;

/** Abbreviate common location names for compact display */
const abbreviateLocation = (address: string): string => {
  if (!address) return "—";
  const upper = address.toUpperCase();
  // Airport codes
  if (upper.includes("KLIA") || upper.includes("KUALA LUMPUR INTERNATIONAL"))
    return "KLIA";
  if (upper.includes("SUBANG") || upper.includes("SULTAN ABDUL AZIZ"))
    return "SZB";
  // Hotels / landmarks – first word or first 8 chars
  const parts = address.split(/[,\-]/);
  const first = (parts[0] || "").trim();
  return first.length > 12 ? first.slice(0, 10) + "…" : first;
};

/** Derive transfer type from pickup/drop – DP (departure / going TO airport) or AR (arrival / coming FROM airport) */
const getTransferType = (booking: Booking): "DP" | "AR" => {
  const dropUpper = (booking.drop?.address ?? "").toUpperCase();
  if (
    dropUpper.includes("KLIA") ||
    dropUpper.includes("AIRPORT") ||
    dropUpper.includes("TERMINAL")
  )
    return "DP";
  return "AR";
};

/** Format date as D/M/YYYY */
const fmtDate = (iso: string): string => {
  try {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  } catch {
    return "—";
  }
};

/** Format time as HH.MM */
const fmtTime = (iso: string): string => {
  try {
    const d = new Date(iso);
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}.${m}`;
  } catch {
    return "—";
  }
};

/** Map vehicle category to display label */
const vehicleLabel = (cat: string | undefined): string => {
  if (!cat) return "—";
  switch (cat.toUpperCase()) {
    case "SEDAN":
      return "Premier";
    case "SUV":
      return "SUV";
    case "LUXURY":
      return "EV Premier";
    case "VAN":
      return "10 seater";
    case "LIMOUSINE":
      return "MPV Premier";
    default:
      return cat;
  }
};

// ── colour helpers for "From" / "To" cells ───────────────────
const LOCATION_COLORS: Record<string, string> = {
  MOXY: "#FF9800", // orange
  PKLCC: "#FF9800", // orange
  FPKLCC: "#00BCD4", // cyan
  MEAKL: "#00BCD4", // cyan
  ICKL: "#00BCD4", // cyan
  ICKCKL: "#00BCD4",
  PRCKUL: "#FFF9C4", // light yellow
  RKL: "#FFF9C4",
  ALILA: "#FFF9C4",
};

const getLocationCellColor = (abbr: string): string | undefined => {
  const key = abbr.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return LOCATION_COLORS[key];
};

// ── column config ────────────────────────────────────────────
interface Column {
  key: string;
  label: string;
  width: number;
  align?: "left" | "center" | "right";
}

const COLUMNS: Column[] = [
  { key: "no", label: "No", width: 36, align: "center" },
  { key: "date", label: "Date", width: 80, align: "center" },
  { key: "type", label: "Type", width: 40, align: "center" },
  { key: "guest", label: "Guest Name", width: 180, align: "left" },
  { key: "from", label: "From", width: 90, align: "center" },
  { key: "to", label: "To", width: 90, align: "center" },
  { key: "time", label: "Time", width: 52, align: "center" },
  { key: "car", label: "Type of car", width: 100, align: "center" },
  { key: "driver", label: "Driver", width: 90, align: "center" },
  { key: "carNum", label: "Car Number", width: 90, align: "center" },
  { key: "price", label: "Price", width: 70, align: "right" },
  { key: "voucher", label: "Voucher", width: 80, align: "center" },
  { key: "remarks", label: "Remarks", width: 180, align: "left" },
];

const TOTAL_ROW_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0);

// ── row data builder ─────────────────────────────────────────
interface RowData {
  no: number;
  date: string;
  type: "DP" | "AR";
  guest: string;
  from: string;
  to: string;
  time: string;
  car: string;
  driver: string;
  carNum: string;
  price: string;
  voucher: string;
  remarks: string;
  booking: Booking;
}

const buildRow = (b: Booking, idx: number): RowData => ({
  no: idx + 1,
  date: fmtDate(b.scheduledTime || b.createdAt),
  type: getTransferType(b),
  guest: b.guestName || b.customerName || "—",
  from: abbreviateLocation(b.pickup?.address ?? ""),
  to: abbreviateLocation(b.drop?.address ?? ""),
  time: fmtTime(b.scheduledTime || b.createdAt),
  car: vehicleLabel(b.vehicleCategory),
  driver: b.driver?.name ?? "—",
  carNum: b.vehicle?.registrationNumber ?? b.driver?.vehicleNumber ?? "—",
  price: b.fare != null ? b.fare.toFixed(2) : "—",
  voucher: b.bookingId ?? "—",
  remarks: b.notes ?? "",
  booking: b,
});

// ── status → row tint ────────────────────────────────────────
const getRowTint = (b: Booking): string | undefined => {
  if (b.hasSOS) return "#FFCDD2"; // red tint for SOS
  switch (b.status) {
    case BookingStatus.CANCELLED:
      return "#FFCDD2"; // light red
    case BookingStatus.COMPLETED:
      return "#E8F5E9"; // light green
    default:
      return undefined;
  }
};

// ── component ────────────────────────────────────────────────
interface BookingsTableViewProps {
  bookings: Booking[];
  onViewDetails: (booking: Booking) => void;
}

export const BookingsTableView: React.FC<BookingsTableViewProps> = ({
  bookings,
  onViewDetails,
}) => {
  const rows: RowData[] = useMemo(
    () => bookings.map((b, i) => buildRow(b, i)),
    [bookings],
  );

  /* ── Header row ─────────────────────────────────── */
  const renderHeader = () => (
    <View style={[styles.row, styles.headerRow]}>
      {COLUMNS.map((col) => (
        <View
          key={col.key}
          style={[styles.cell, styles.headerCell, { width: col.width }]}
        >
          <Text
            style={[styles.headerText, { textAlign: col.align ?? "left" }]}
            numberOfLines={1}
          >
            {col.label}
          </Text>
        </View>
      ))}
    </View>
  );

  /* ── Data cell renderer ─────────────────────────── */
  const renderCell = (col: Column, row: RowData) => {
    const value = (row as any)[col.key] as string | number;
    const text = String(value);
    let cellBg: string | undefined;
    let textColor = "#1a1a1a";
    let fontWeight: "bold" | "normal" | "600" = "normal";

    // Type badge colouring
    if (col.key === "type") {
      cellBg = row.type === "DP" ? "#FFF3E0" : "#E3F2FD";
      fontWeight = "bold";
      textColor = row.type === "DP" ? "#E65100" : "#0D47A1";
    }

    // From / To location highlights
    if (col.key === "from" || col.key === "to") {
      const locColor = getLocationCellColor(text);
      if (locColor) cellBg = locColor;
    }

    // Remarks in red if present
    if (col.key === "remarks" && text) {
      textColor = "#C62828";
      fontWeight = "600";
    }

    // Price bold
    if (col.key === "price") {
      fontWeight = "600";
    }

    return (
      <View
        key={col.key}
        style={[styles.cell, { width: col.width, backgroundColor: cellBg }]}
      >
        <Text
          style={[
            styles.cellText,
            {
              textAlign: col.align ?? "left",
              color: textColor,
              fontWeight,
            },
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {text}
        </Text>
      </View>
    );
  };

  /* ── Data row ───────────────────────────────────── */
  const renderRow = (row: RowData) => {
    const rowTint = getRowTint(row.booking);
    const isEven = row.no % 2 === 0;

    return (
      <TouchableOpacity
        key={row.booking.id}
        activeOpacity={0.7}
        onPress={() => onViewDetails(row.booking)}
        style={[
          styles.row,
          {
            backgroundColor: rowTint ?? (isEven ? "#F5F5F5" : "#FFFFFF"),
          },
        ]}
      >
        {COLUMNS.map((col) => renderCell(col, row))}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          Total: <Text style={{ fontWeight: "700" }}>{bookings.length}</Text>{" "}
          bookings
        </Text>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: "#FFF3E0" }]} />
          <Text style={styles.legendLabel}>DP</Text>
          <View style={[styles.legendDot, { backgroundColor: "#E3F2FD" }]} />
          <Text style={styles.legendLabel}>AR</Text>
        </View>
      </View>

      {/* Horizontal scrollable table */}
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={{ width: Math.max(TOTAL_ROW_WIDTH, SCREEN_WIDTH) }}>
          {renderHeader()}
          <ScrollView
            showsVerticalScrollIndicator
            contentContainerStyle={{ paddingBottom: 80 }}
          >
            {rows.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No bookings found</Text>
              </View>
            ) : (
              rows.map(renderRow)
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
};

// ── styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  summaryBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FAFAFA",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  summaryText: {
    fontSize: 13,
    color: "#333",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#CCC",
    marginLeft: 8,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#555",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#D0D0D0",
    minHeight: 34,
  },
  headerRow: {
    backgroundColor: "#1A237E",
  },
  cell: {
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 5,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "#D0D0D0",
  },
  headerCell: {
    borderRightColor: "#3949AB",
  },
  headerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cellText: {
    fontSize: 11,
    color: "#1a1a1a",
  },
  emptyRow: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    color: "#999",
    fontSize: 14,
  },
});
