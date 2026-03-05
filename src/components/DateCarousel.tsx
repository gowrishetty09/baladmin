import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
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

      <View style={styles.dateContainer}>
        <Text
          style={[
            styles.dateText,
            { color: isDark ? Colors.white : Colors.navy },
          ]}
        >
          {formatDisplayDate(selectedDate)}
        </Text>
      </View>

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
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 12,
  },
  dateText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
