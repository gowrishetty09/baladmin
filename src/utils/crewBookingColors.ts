import { Booking } from "../types";

export const CREW_BOOKING_COLORS = [
  "#BFDBFE",
  "#C7D2FE",
  "#DDD6FE",
  "#E9D5FF",
  "#BAE6FD",
  "#D8B4FE",
  "#DBEAFE",
  "#E0E7FF",
  "#EDE9FE",
  "#E0F2FE",
  "#CBD5E1",
  "#D4D4D8",
];

export const getBookingPaymentMethodValue = (
  booking: Pick<Booking, "bookingCategory" | "paymentMethod">,
): string | null => booking.bookingCategory ?? booking.paymentMethod ?? null;

export const formatBookingPaymentMethod = (booking: Booking): string => {
  const value = getBookingPaymentMethodValue(booking);
  return value ? value.replace(/_/g, " ") : "—";
};

export const isCrewBooking = (
  booking: Pick<Booking, "bookingCategory" | "paymentMethod">,
): boolean =>
  String(getBookingPaymentMethodValue(booking) ?? "").toUpperCase() === "CREW";

export const getCrewGuestKey = (
  booking: Pick<Booking, "guestName" | "customerName">,
): string | null => {
  const value = booking.guestName ?? booking.customerName;
  const normalized = value?.trim().replace(/\s+/g, " ").toLowerCase();
  return normalized ? normalized : null;
};

export const buildCrewGuestColorMap = (
  bookings: Booking[],
): Map<string, string> => {
  const names = Array.from(
    new Set(
      bookings
        .filter(isCrewBooking)
        .map(getCrewGuestKey)
        .filter((name): name is string => Boolean(name)),
    ),
  ).sort((a, b) => a.localeCompare(b));

  return new Map(
    names.map((name, index) => [
      name,
      CREW_BOOKING_COLORS[index % CREW_BOOKING_COLORS.length],
    ]),
  );
};

const hashText = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

export const getCrewBookingRowColor = (
  booking: Booking,
  colorMap?: ReadonlyMap<string, string>,
): string | undefined => {
  if (!isCrewBooking(booking)) return undefined;
  const key = getCrewGuestKey(booking);
  if (!key) return undefined;

  return (
    colorMap?.get(key) ??
    CREW_BOOKING_COLORS[hashText(key) % CREW_BOOKING_COLORS.length]
  );
};