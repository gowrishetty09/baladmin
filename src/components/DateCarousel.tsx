import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { useThemeContext } from "../hooks/ThemeContext";

interface DateCarouselProps {
  onDateSelect: (date: string) => void; // YYYY-MM-DD format
  selectedDate: string; // YYYY-MM-DD format
}

export const DateCarousel: React.FC<DateCarouselProps> = ({
  onDateSelect,
  selectedDate,
}) => {
  const { isDark } = useThemeContext();
  const [showPicker, setShowPicker] = useState(false);

  const formatDateToYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const parseDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDisplayDate = (dateStr: string): string => {
    const date = parseDate(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(date);
    selected.setHours(0, 0, 0, 0);

    const dayName = selected.getTime() === today.getTime() 
      ? "Today" 
      : date.toLocaleDateString("en-US", { weekday: "long" });
    
    const day = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const year = date.getFullYear();

    return `${dayName} — ${day} ${month} ${year}`;
  };

  const handlePrevDay = () => {
    const currentDate = parseDate(selectedDate);
    currentDate.setDate(currentDate.getDate() - 1);
    onDateSelect(formatDateToYYYYMMDD(currentDate));
  };

  const handleNextDay = () => {
    const currentDate = parseDate(selectedDate);
    currentDate.setDate(currentDate.getDate() + 1);
    onDateSelect(formatDateToYYYYMMDD(currentDate));
  };

  const handlePickerChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    if (date) {
      onDateSelect(formatDateToYYYYMMDD(date));
    }
  };

  const pickerDate = parseDate(selectedDate);

  return (
    <View
      style={[
        styles.container,
        { 
          backgroundColor: isDark ? Colors.navy + "CC" : Colors.white,
          borderColor: isDark ? "rgba(255,255,255,0.1)" : Colors.borderLight,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.arrowButton,
          { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F5F5F5" },
        ]}
        onPress={handlePrevDay}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="chevron-back" 
          size={20} 
          color={isDark ? Colors.ivory : Colors.navy} 
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.dateContainer}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.dateText,
            { color: isDark ? Colors.white : Colors.navy },
          ]}
        >
          {formatDisplayDate(selectedDate)}
        </Text>
        <Ionicons
          name="calendar-outline"
          size={14}
          color={isDark ? Colors.ivory + "99" : Colors.navy + "88"}
          style={styles.calendarIcon}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.arrowButton,
          { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F5F5F5" },
        ]}
        onPress={handleNextDay}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color={isDark ? Colors.ivory : Colors.navy} 
        />
      </TouchableOpacity>

      {/* Android: renders as a native dialog */}
      {Platform.OS === "android" && showPicker && (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          onChange={handlePickerChange}
        />
      )}

      {/* iOS: modal wrapper with Done button */}
      {Platform.OS === "ios" && (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowPicker(false)}
          />
          <View style={[styles.iosPickerContainer, { backgroundColor: isDark ? "#1A1A1A" : Colors.white }]}>
            <View style={[styles.iosPickerHeader, { borderBottomColor: isDark ? "rgba(255,255,255,0.1)" : Colors.borderLight }]}>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={[styles.iosPickerCancel, { color: isDark ? Colors.ivory + "99" : Colors.navy + "88" }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.iosPickerTitle, { color: isDark ? Colors.white : Colors.navy }]}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={styles.iosPickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={pickerDate}
              mode="date"
              display="spinner"
              onChange={handlePickerChange}
              textColor={isDark ? Colors.white : Colors.navy}
              style={styles.iosPicker}
            />
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  dateContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 12,
  },
  dateText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  calendarIcon: {
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  iosPickerContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  iosPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  iosPickerTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  iosPickerCancel: {
    fontSize: 15,
  },
  iosPickerDone: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.primary,
  },
  iosPicker: {
    width: "100%",
  },
});
