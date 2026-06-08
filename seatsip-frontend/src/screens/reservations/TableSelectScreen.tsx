import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  ImageBackground,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { cafesApi } from "../../services/api";
import AppIcon from '../../components/ui/AppIcon';

const { width: SCREEN_W } = Dimensions.get('window');

type Route = RouteProp<RootStackParamList, 'TableSelect'>;

const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 8, 10];

function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function formatLocationLine(address?: string, city?: string) {
  const parts = [address?.trim(), city?.trim()].filter(Boolean);
  return parts.length ? parts.join(', ') : '';
}

const SelectTableScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<Route>();
  const cafeId = route.params?.cafeId;
  const cafeName = route.params?.cafeName || "Café";

  const [partySize, setPartySize] = useState(2);
  const [times, setTimes] = useState<string[]>(["09:00", "11:00", "13:00", "15:00", "17:00", "19:00"]);
  const [time, setTime] = useState("19:00");
  const [reservationDate] = useState(() => getTomorrow());
  const [floor, setFloor] = useState("Ground");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationLine, setLocationLine] = useState("");

  const fetchCafeMeta = useCallback(async () => {
    if (!cafeId) return;
    try {
      const { data } = await cafesApi.getById(cafeId);
      if (data.success && data.data) {
        const line = formatLocationLine(data.data.address, data.data.city);
        setLocationLine(line);

        const slotsRaw = data.data.reservation_slots;
        if (slotsRaw) {
          const parsed = typeof slotsRaw === 'string' ? JSON.parse(slotsRaw) : slotsRaw;
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTimes(parsed);
            setTime(parsed[0]);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch cafe meta:", err);
      setLocationLine("");
    }
  }, [cafeId]);

  const fetchTables = useCallback(async () => {
    if (!cafeId) return;
    try {
      setLoading(true);
      const response = await cafesApi.getTables(cafeId, {
        date: reservationDate,
        time,
        party_size: partySize,
      });
      if (response.data.success && response.data.data.tables) {
        const next = response.data.data.tables as any[];
        setTables(next);
        const firstMatch = next.find((t: any) => t.capacity >= partySize && t.is_available !== 0);
        setSelectedTable(firstMatch?.id ?? null);
      } else {
        setTables([]);
        setSelectedTable(null);
      }
    } catch (error) {
      console.error("Error fetching tables:", error);
      setTables([]);
      setSelectedTable(null);
    } finally {
      setLoading(false);
    }
  }, [cafeId, reservationDate, time, partySize]);

  useEffect(() => {
    fetchCafeMeta();
  }, [fetchCafeMeta]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const handleContinue = () => {
    if (!selectedTable) return;
    navigation.navigate('ReservationDetails', {
      cafeId: cafeId!,
      cafeName,
      tableId: selectedTable,
      cafeAddress: locationLine || undefined,
      partySize,
      time,
      date: reservationDate,
    });
  };

  const subtitle = locationLine ? `${cafeName} • ${locationLine}` : cafeName;

  return (
    <ImageBackground
      source={require('../../assets/images/app_bg.png')}
      style={styles.root}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        
        {/* Custom Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <AppIcon name="back" size={20} color="#1A1A1A" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Select Table</Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={styles.container} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Party Size */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Party Size</Text>
            <Text style={styles.sectionSub}>How many guests?</Text>

            <View style={styles.row}>
              {PARTY_SIZES.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.circle,
                    partySize === item && styles.selectedCircle,
                  ]}
                  onPress={() => {
                    setPartySize(item);
                    const currentTable = tables.find(t => t.id === selectedTable);
                    if (currentTable && currentTable.capacity < item) {
                      setSelectedTable(null);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.circleText,
                      partySize === item && styles.selectedText,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date & Time */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Date & Time</Text>
            <Text style={styles.sectionSub}>Reservations open for {reservationDate} — choose a time</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              {times.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.timeBtn,
                    time === t && styles.selectedTime,
                  ]}
                  onPress={() => setTime(t)}
                >
                  <Text
                    style={[
                      styles.timeText,
                      time === t && styles.selectedText,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Floor Selection */}
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Select Floor</Text>
              <View style={styles.floorRow}>
                {["Ground", "First"].map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[
                      styles.floorBtnSmall,
                      floor === f && styles.selectedFloor,
                    ]}
                    onPress={() => setFloor(f)}
                  >
                    <Text
                      style={[
                        styles.floorTextSmall,
                        floor === f && styles.selectedText,
                      ]}
                    >
                      {f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Tables Grid */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B5E3C" />
              <Text style={styles.loadingText}>Fetching available tables...</Text>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Available Tables</Text>
              <Text style={styles.sectionSub}>Select your preferred spot</Text>

              <View style={styles.tableGrid}>
                {tables
                  .filter(t => t.floor === floor)
                  .map((item) => {
                    const isSelected = selectedTable === item.id;
                    const isDisabled = item.capacity < partySize || item.is_available === 0;

                    return (
                      <TouchableOpacity
                        key={item.id}
                        disabled={isDisabled}
                        style={[
                          styles.tableCard,
                          isSelected && styles.selectedTableCard,
                          isDisabled && styles.disabledTable,
                        ]}
                        onPress={() => setSelectedTable(item.id)}
                      >
                        <View style={styles.tableIconContainer}>
                          <AppIcon name="reservation" size={22} color={isSelected ? '#fff' : '#8B5E3C'} />
                        </View>
                        <Text style={[styles.tableId, isSelected && styles.selectedText]}>
                          Table {item.table_number}
                        </Text>
                        <Text style={[styles.tableSeats, isSelected && styles.selectedText]}>
                          {item.capacity} Seats
                        </Text>
                        {isDisabled && (
                          <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>
                              {item.is_available === 0 ? "Booked" : "Small"}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
              </View>
              
              {tables.filter(t => t.floor === floor).length === 0 && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No tables available on this floor.</Text>
                </View>
              )}
            </View>
          )}
          
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Footer CTA */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.continueBtn, !selectedTable && styles.disabledContinue]}
            onPress={handleContinue}
            disabled={!selectedTable}
          >
            <Text style={styles.continueText}>Continue to Details</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const PRIMARY = "#8B5E3C"; // coffee brown

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    padding: 20,
    width: '100%',
  },

  title: {
    fontSize: 20,
    fontWeight: "800",
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
    textAlign: 'center',
    paddingHorizontal: 12,
  },

  section: {
    marginBottom: 25,
    width: '100%',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: '#1A1A1A',
    marginBottom: 4,
  },

  sectionSub: {
    color: "#8E8E93",
    fontSize: 13,
    marginBottom: 16,
  },

  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },

  circle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: "#E5E5E7",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'white',
  },

  selectedCircle: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },

  circleText: {
    color: "#333",
    fontWeight: '700',
    fontSize: 15,
  },

  selectedText: {
    color: "#fff",
  },

  timeBtn: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E5E5E7",
    backgroundColor: 'white',
  },

  selectedTime: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },

  timeText: {
    color: "#333",
    fontWeight: '700',
  },

  floorRow: {
    flexDirection: 'row',
    gap: 8,
  },

  floorBtnSmall: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E5E5E7",
    backgroundColor: 'white',
  },

  selectedFloor: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },

  floorTextSmall: {
    color: "#333",
    fontSize: 14,
    fontWeight: '700',
  },

  tableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },

  tableCard: {
    width: (SCREEN_W - 52) / 3,
    margin: 6,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  selectedTableCard: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },

  disabledTable: {
    backgroundColor: "#F0F0F0",
    opacity: 0.5,
  },

  tableIconContainer: {
    marginBottom: 8,
  },

  tableId: {
    fontWeight: "800",
    fontSize: 14,
    color: '#1A1A1A',
  },

  tableSeats: {
    marginTop: 2,
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: '700',
  },

  statusBadge: {
    marginTop: 8,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '800',
  },

  footer: {
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
    width: '100%',
  },

  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },

  loadingText: {
    marginTop: 12,
    color: PRIMARY,
    fontWeight: '700',
    fontSize: 15,
  },

  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    width: '100%',
  },

  emptyText: {
    color: '#999',
    fontWeight: '600',
  },

  continueBtn: {
    backgroundColor: PRIMARY,
    padding: 20,
    borderRadius: 18,
    alignItems: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    width: '100%',
  },

  disabledContinue: {
    backgroundColor: '#D1D1D6',
    shadowOpacity: 0,
    elevation: 0,
  },

  continueText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 17,
  },
});

export default SelectTableScreen;

