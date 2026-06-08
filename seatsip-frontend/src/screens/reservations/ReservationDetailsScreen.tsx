import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  ImageBackground,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { reservationsApi, cafesApi } from '../../services/api';
import { takePreOrderDraft } from '../../reservation/preOrderDraft';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../../components/ui/AppIcon';

type Route = RouteProp<RootStackParamList, 'ReservationDetails'>;

function formatLocationLine(address?: string, city?: string) {
  const parts = [address?.trim(), city?.trim()].filter(Boolean);
  return parts.length ? parts.join(', ') : '';
}

const TIMES = ["09:00", "11:00", "13:00", "15:00", "17:00", "19:00"];
const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const ReservationDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const route = useRoute<Route>();
  const { cafeId, cafeName, tableId, cafeAddress: paramAddress, partySize: paramPartySize, time: paramTime, date: paramDate } = route.params;

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addressLine, setAddressLine] = useState(paramAddress || '');

  // Main state
  const [date, setDate] = useState(paramDate || getTomorrow());
  const [time, setTime] = useState(paramTime || "19:00");
  const [partySize, setPartySize] = useState(paramPartySize || 2);
  const [notes, setNotes] = useState("");

  function getTomorrow() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  useEffect(() => {
    if (paramAddress) {
      setAddressLine(paramAddress);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await cafesApi.getById(cafeId);
        if (!cancelled && data.success && data.data) {
          setAddressLine(formatLocationLine(data.data.address, data.data.city));
        }
      } catch {
        if (!cancelled) setAddressLine('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cafeId, paramAddress]);

  function formatDate(dStr: string) {
    const d = new Date(dStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  }

  // Backup (for cancel)
  const [backup, setBackup] = useState({ time: paramTime || "19:00", partySize: paramPartySize || 2, notes: "" });

  const handleEdit = () => {
    setBackup({ time, partySize, notes });
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTime(backup.time);
    setPartySize(backup.partySize);
    setNotes(backup.notes);
    setIsEditing(false);
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      console.log("Sending reservation request...", { cafeId, tableId, date, time });
      const preDraft = takePreOrderDraft();
      const { data } = await reservationsApi.create({
        cafe_id: cafeId,
        table_id: tableId,
        date: date,
        time,
        party_size: partySize,
        special_requests: notes || undefined,
        pre_order_items: preDraft.length ? preDraft : undefined,
      });
      console.log("Reservation success:", data);
      navigation.replace('BookingConfirmed', { reservation: data.data });
    } catch (err: any) {
      console.error("Reservation error:", err?.response?.data || err.message);
      Alert.alert('Booking failed', err?.response?.data?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/app_bg.png')} 
      style={styles.root}
      resizeMode="cover"
    >
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <AppIcon name="back" size={20} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Reservation Details</Text>
          <Text style={styles.subtitle}>
            {addressLine ? `${cafeName} • ${addressLine}` : cafeName}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Card */}
        <View style={styles.card}>
          {/* Date */}
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.label}>Date</Text>
              <Text style={styles.value}>{formatDate(date)}</Text>
            </View>

            {!isEditing && (
              <TouchableOpacity
                style={styles.changeBtn}
                onPress={handleEdit}
              >
                <Text style={styles.changeText}>Change</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Time */}
          <View style={styles.section}>
            <Text style={styles.label}>Time</Text>

            <View style={styles.row}>
              {TIMES.map((t) => {
                const selected = t === time;

                return (
                  <TouchableOpacity
                    key={t}
                    disabled={!isEditing}
                    onPress={() => setTime(t)}
                    style={[
                      styles.timeBtn,
                      selected && styles.selected,
                      !isEditing && styles.disabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.timeText,
                        selected && styles.selectedText,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Party Size */}
          <View style={styles.section}>
            <Text style={styles.label}>Party Size</Text>

            <View style={styles.row}>
              {PARTY_SIZES.map((n) => {
                const selected = n === partySize;

                return (
                  <TouchableOpacity
                    key={n}
                    disabled={!isEditing}
                    onPress={() => setPartySize(n)}
                    style={[
                      styles.circle,
                      selected && styles.selected,
                      !isEditing && styles.disabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.circleText,
                        selected && styles.selectedText,
                      ]}
                    >
                      {n}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.label}>Special Requests (optional)</Text>

            <TextInput
              style={[
                styles.input,
                !isEditing && styles.disabledInput,
              ]}
              placeholder="e.g. Window seat, birthday decoration..."
              value={notes}
              onChangeText={setNotes}
              editable={isEditing}
              maxLength={120}
              multiline
            />

            <Text style={styles.counter}>{notes.length}/120</Text>
          </View>

          {/* Edit Actions */}
          {isEditing && (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCancel}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
              >
                <Text style={styles.saveText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Booking Summary</Text>

          <SummaryRow label="Venue" value={cafeName} />
          <SummaryRow label="Date" value={date} />
          <SummaryRow label="Time" value={time} />
          <SummaryRow label="Party Size" value={`${partySize} people`} />
          {tableId && <SummaryRow label="Table" value={`Table ID: ${tableId}`} />}
        </View>

        {/* Confirm Button */}
        {!isEditing && (
          <>
            <TouchableOpacity
              style={styles.secondaryBtn}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('PreOrderMenu', {
                  cafeId,
                  cafeName,
                  reservationData: {
                    cafe_id: cafeId,
                    cafe_name: cafeName,
                    table_id: tableId,
                    date,
                    time,
                    party_size: partySize,
                    special_requests: notes,
                  },
                })
              }
            >
              <Text style={styles.secondaryBtnText}>Pre-order food (optional)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, loading && styles.disabledConfirm]}
              onPress={handleConfirm}
              disabled={loading}
            >
              <Text style={styles.confirmText}>
                {loading ? 'Confirming...' : 'Confirm Reservation'}
              </Text>
            </TouchableOpacity>
          </>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>
      </View>
    </ImageBackground>
  );
};

const SummaryRow = ({ label, value }: { label: string, value: string }) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
  </View>
);

const PRIMARY = "#8B5E3C";
const BG = "#F6F3EF";

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%' },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#333',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  container: { flex: 1, padding: 20 },

  title: {
    fontSize: 20,
    fontWeight: "800",
    color: '#1A1A1A',
  },

  subtitle: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 2,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  label: { fontWeight: "700", marginBottom: 8, color: '#1A1A1A' },

  value: { fontSize: 16, fontWeight: "600", color: '#333' },

  changeBtn: {
    borderWidth: 1.5,
    borderColor: PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },

  changeText: { color: PRIMARY, fontWeight: '700', fontSize: 13 },

  section: { marginTop: 20 },

  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  timeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E5E7",
    backgroundColor: 'white',
  },

  selected: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },

  selectedText: { color: "#fff", fontWeight: '600' },

  disabled: { opacity: 0.4 },

  timeText: { color: '#333', fontWeight: '500' },

  circle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#E5E5E7",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'white',
  },

  circleText: { color: '#333', fontWeight: '500' },

  input: {
    borderWidth: 1,
    borderColor: "#E5E5E7",
    borderRadius: 12,
    padding: 12,
    height: 100,
    textAlignVertical: "top",
    color: '#1A1A1A',
    backgroundColor: '#FAFAFA',
  },

  disabledInput: {
    backgroundColor: "#F2F2F2",
    color: '#999',
  },

  counter: {
    textAlign: "right",
    marginTop: 5,
    color: "#8E8E93",
    fontSize: 11,
  },

  editActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    alignItems: 'center',
  },

  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },

  cancelText: {
    color: "#8E8E93",
    fontWeight: '600',
  },

  saveBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },

  saveText: {
    color: "#fff",
    fontWeight: "700",
  },

  summary: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  summaryTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: '#1A1A1A',
    marginBottom: 12,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },

  summaryLabel: { color: "#8E8E93", fontSize: 14 },

  summaryValue: { fontWeight: "700", color: '#333', fontSize: 14 },

  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: PRIMARY,
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: PRIMARY,
    fontWeight: '700',
    fontSize: 15,
  },

  confirmBtn: {
    backgroundColor: PRIMARY,
    padding: 18,
    borderRadius: 16,
    marginTop: 20,
    alignItems: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  confirmText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  disabledConfirm: {
    opacity: 0.7,
  }
});

export default ReservationDetailsScreen;
