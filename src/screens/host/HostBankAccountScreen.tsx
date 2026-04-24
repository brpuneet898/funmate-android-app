import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import LinearGradient from 'react-native-linear-gradient';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// ─── Types ────────────────────────────────────────────────────────────────────

type BankAccount = {
  bankName: string;
  accountHolderName: string;
  accountLast4: string;
  ifsc: string;
  accountType: 'savings' | 'current';
  status: 'verified' | 'pending' | 'rejected';
  verifiedAt: any | null;
  bankVerificationMeta?: {
    bankReturnedName?: string | null;
    nameMismatch?: boolean;
    verificationId?: string | null;
  } | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (ts: any): string => {
  if (!ts) return '—';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return '—'; }
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ─── Detail Row ───────────────────────────────────────────────────────────────

const DetailRow = React.memo(({ icon, label, value }: {
  icon: string; label: string; value: string;
}) => (
  <View style={rowStyles.row}>
    <View style={rowStyles.iconWrap}>
      <Ionicons name={icon} size={16} color="rgba(255,255,255,0.55)" />
    </View>
    <View style={rowStyles.content}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  </View>
));

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.10)',
  },
  iconWrap: {
    width: 32,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 8,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  value: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const HostBankAccountScreen = () => {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();
  const uid        = auth().currentUser?.uid ?? '';

  // ── View state ──
  const [account,   setAccount]   = useState<BankAccount | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [noAccount, setNoAccount] = useState(false);

  // ── Edit state ──
  const [editMode,     setEditMode]     = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [holderName,   setHolderName]   = useState('');
  const [accountNo,    setAccountNo]    = useState('');
  const [confirmNo,    setConfirmNo]    = useState('');
  const [ifsc,         setIfsc]         = useState('');
  const [bankName,     setBankName]     = useState('');
  const [accountType,  setAccountType]  = useState<'savings' | 'current'>('savings');

  // ── Load ──────────────────────────────────────────────────────────────────

  const fetchAccount = useCallback(async () => {
    if (!uid) return;
    const snap = await firestore().collection('bankAccounts').doc(uid).get();
    if (snap.exists()) {
      setAccount(snap.data() as BankAccount);
    } else {
      setNoAccount(true);
    }
  }, [uid]);

  useEffect(() => {
    setLoading(true);
    fetchAccount().finally(() => setLoading(false));
  }, [fetchAccount]);

  // ── Enter edit mode ───────────────────────────────────────────────────────

  const enterEdit = () => {
    const ba = account!;
    setHolderName(ba.accountHolderName ?? '');
    setAccountNo('');
    setConfirmNo('');
    setIfsc(ba.ifsc ?? '');
    setBankName(ba.bankName ?? '');
    setAccountType(ba.accountType ?? 'savings');
    setEditMode(true);
  };

  const cancelEdit = () => setEditMode(false);

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!holderName.trim()) {
      Toast.show({ type: 'error', text1: 'Account holder name is required' });
      return;
    }
    if (!accountNo.trim() || accountNo.replace(/\s/g, '').length < 9) {
      Toast.show({ type: 'error', text1: 'Enter a valid account number' });
      return;
    }
    if (accountNo.replace(/\s/g, '') !== confirmNo.replace(/\s/g, '')) {
      Toast.show({ type: 'error', text1: 'Account numbers do not match' });
      return;
    }
    const ifscClean = ifsc.trim().toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscClean)) {
      Toast.show({ type: 'error', text1: 'Invalid IFSC code', text2: 'Format: ABCD0123456' });
      return;
    }
    if (!bankName.trim()) {
      Toast.show({ type: 'error', text1: 'Bank name is required' });
      return;
    }

    setSaving(true);
    try {
      const acctNoClean = accountNo.replace(/\s/g, '');
      const last4 = acctNoClean.slice(-4);

      const updated: Partial<BankAccount> = {
        accountHolderName: holderName.trim(),
        accountLast4:      last4,
        ifsc:              ifscClean,
        bankName:          bankName.trim(),
        accountType,
        status:            'pending',
        verifiedAt:        null,
        bankVerificationMeta: null,
      };

      await Promise.all([
        firestore().collection('bankAccounts').doc(uid).update(updated),
        firestore().collection('accounts').doc(uid).update({ bankVerified: false }),
      ]);

      setAccount(prev => prev ? { ...prev, ...updated } : prev);
      setEditMode(false);
      Toast.show({ type: 'success', text1: 'Bank details updated', text2: 'Re-verification is in progress.' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to save', text2: 'Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  // ── Status config ─────────────────────────────────────────────────────────

  const statusCfg = (() => {
    switch (account?.status) {
      case 'verified': return { label: 'Verified',  color: '#34C759', bg: 'rgba(52,199,89,0.15)',   icon: 'checkmark-circle' };
      case 'pending':  return { label: 'Pending',   color: '#FF9F0A', bg: 'rgba(255,159,10,0.15)',  icon: 'time-outline'     };
      case 'rejected': return { label: 'Rejected',  color: '#FF5252', bg: 'rgba(255,82,82,0.15)',   icon: 'close-circle'     };
      default:         return { label: 'Unknown',   color: '#7F93AA', bg: 'rgba(127,147,170,0.15)', icon: 'help-circle'      };
    }
  })();

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <ImageBackground source={require('../../assets/images/bg_splash.webp')} style={styles.container} blurRadius={8} resizeMode="cover">
        <View style={styles.overlay}>
          <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#06B6D4" />
          </View>
        </View>
      </ImageBackground>
    );
  }

  // ── No bank account on file ───────────────────────────────────────────────

  if (noAccount) {
    return (
      <ImageBackground source={require('../../assets/images/bg_splash.webp')} style={styles.container} blurRadius={8} resizeMode="cover">
        <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Bank Account</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="card-outline" size={52} color="#06B6D4" />
          <Text style={styles.emptyTitle}>No Bank Account</Text>
          <Text style={styles.emptySubtitle}>
            No bank account has been linked to your profile yet.
          </Text>
        </View>
      </View>
      </ImageBackground>
    );
  }

  const ba = account!;

  // ─────────────────────────────────────────────────────────────────────────
  // EDIT FORM
  // ─────────────────────────────────────────────────────────────────────────

  if (editMode) {
    return (
    <ImageBackground source={require('../../assets/images/bg_splash.webp')} style={styles.container} blurRadius={8} resizeMode="cover">
      <View style={styles.overlay}>
      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss();
          setFocusedInput(null);
        }}
      >
        <View style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <View style={[styles.navBar, { paddingTop: insets.top + 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.12)' }]}>
          <TouchableOpacity onPress={cancelEdit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.cancelBtn}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>Update Bank Account</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            {saving
              ? <ActivityIndicator size="small" color="#06B6D4" />
              : <Text style={styles.saveBtnText}>Save</Text>
            }
          </TouchableOpacity>
        </View>

          <KeyboardAwareScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(40, insets.bottom + 40) }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid={true}
            extraScrollHeight={100}
            extraHeight={150}
            enableAutomaticScroll={true}
            keyboardOpeningTime={0}
          >
          {/* Re-verification notice */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={16} color="#06B6D4" style={{ marginTop: 1 }} />
            <Text style={styles.infoText}>
              After saving, your account will be marked as pending re-verification. Payouts will pause briefly until verified.
            </Text>
          </View>

          {/* Account Holder Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Account Holder Name</Text>
            <TextInput
              style={[styles.input, focusedInput === 'holderName' && styles.inputFocused]}
              value={holderName}
              onChangeText={setHolderName}
              placeholder="As on bank records"
              placeholderTextColor="rgba(255,255,255,0.35)"
              onFocus={() => setFocusedInput('holderName')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          {/* Account Number */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>New Account Number</Text>
            <TextInput
              style={[styles.input, focusedInput === 'accountNo' && styles.inputFocused]}
              value={accountNo}
              onChangeText={setAccountNo}
              placeholder="Enter full account number"
              placeholderTextColor="rgba(255,255,255,0.35)"
              keyboardType="number-pad"
              secureTextEntry
              onFocus={() => setFocusedInput('accountNo')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          {/* Confirm Account Number */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Confirm Account Number</Text>
            <TextInput
              style={[styles.input, focusedInput === 'confirmNo' && styles.inputFocused]}
              value={confirmNo}
              onChangeText={setConfirmNo}
              placeholder="Re-enter account number"
              placeholderTextColor="rgba(255,255,255,0.35)"
              keyboardType="number-pad"
              onFocus={() => setFocusedInput('confirmNo')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          {/* IFSC */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>IFSC Code</Text>
            <TextInput
              style={[styles.input, focusedInput === 'ifsc' && styles.inputFocused]}
              value={ifsc}
              onChangeText={t => setIfsc(t.toUpperCase())}
              placeholder="e.g. SBIN0001234"
              placeholderTextColor="rgba(255,255,255,0.35)"
              autoCapitalize="characters"
              maxLength={11}
              onFocus={() => setFocusedInput('ifsc')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          {/* Bank Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Bank Name</Text>
            <TextInput
              style={[styles.input, focusedInput === 'bankName' && styles.inputFocused]}
              value={bankName}
              onChangeText={setBankName}
              placeholder="e.g. State Bank of India"
              placeholderTextColor="rgba(255,255,255,0.35)"
              onFocus={() => setFocusedInput('bankName')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          {/* Account Type */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Account Type</Text>
            <View style={styles.typeRow}>
              {(['savings', 'current'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, accountType === t && styles.typeChipActive]}
                  onPress={() => setAccountType(t)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.typeChipText, accountType === t && styles.typeChipTextActive]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
      </KeyboardAwareScrollView>
        </View>
      </TouchableWithoutFeedback>
      </View>
      </ImageBackground>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // READ-ONLY VIEW
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <ImageBackground source={require('../../assets/images/bg_splash.webp')} style={styles.container} blurRadius={8} resizeMode="cover">
      <View style={styles.overlay}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={[styles.navBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Bank Account</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(32, insets.bottom + 32) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Status badge ── */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg, borderColor: statusCfg.color + '55' }]}>
            <Ionicons name={statusCfg.icon} size={13} color={statusCfg.color} />
            <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
          {ba.verifiedAt ? (
            <Text style={styles.verifiedDate}>Verified {fmtDate(ba.verifiedAt)}</Text>
          ) : null}
        </View>

        {/* ── Account details card ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Account Details</Text>

          <DetailRow
            icon="business-outline"
            label="Bank"
            value={ba.bankName || '—'}
          />
          <DetailRow
            icon="person-outline"
            label="Account Holder"
            value={ba.accountHolderName || '—'}
          />
          <DetailRow
            icon="card-outline"
            label="Account Number"
            value={`••••  ••••  ${ba.accountLast4}`}
          />
          <DetailRow
            icon="code-outline"
            label="IFSC Code"
            value={ba.ifsc || '—'}
          />
          <View style={[rowStyles.row, { borderBottomWidth: 0 }]}>
            <View style={rowStyles.iconWrap}>
              <Ionicons name="wallet-outline" size={16} color="rgba(255,255,255,0.55)" />
            </View>
            <View style={rowStyles.content}>
              <Text style={rowStyles.label}>Account Type</Text>
              <Text style={rowStyles.value}>{ba.accountType ? capitalize(ba.accountType) : '—'}</Text>
            </View>
          </View>
        </View>

        {/* ── Name match note ── */}
        {ba.bankVerificationMeta?.nameMismatch && ba.bankVerificationMeta?.bankReturnedName ? (
          <View style={styles.mismatchCard}>
            <Ionicons name="information-circle-outline" size={16} color="#FF9F0A" />
            <Text style={styles.mismatchText}>
              Bank records show the name as "{ba.bankVerificationMeta.bankReturnedName}". This was accepted during verification.
            </Text>
          </View>
        ) : null}

        {/* ── Warning notice ── */}
        <View style={styles.warningCard}>
          <Ionicons name="warning-outline" size={16} color="#FF9F0A" style={{ marginTop: 1 }} />
          <Text style={styles.warningText}>
            Updating your bank account requires re-verification. Payouts will pause until verification is complete — this usually takes just a few minutes.
          </Text>
        </View>

        {/* ── Update button ── */}
        <TouchableOpacity
          style={styles.updateButton}
          activeOpacity={0.8}
          onPress={enterEdit}
        >
          <LinearGradient
            colors={['#8B2BE2', '#06B6D4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.updateButtonGradient}
          >
            <Ionicons name="pencil-outline" size={17} color="#FFFFFF" />
            <Text style={styles.updateButtonText}>Update Bank Account</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
    </ImageBackground>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0B1E',
  },
  keyboardContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 11, 30, 0.60)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  navTitle: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  // ── Status ──
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },
  verifiedDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.55)',
  },
  // ── Card ──
  card: {
    backgroundColor: 'rgba(26, 21, 48, 0.78)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  // ── Mismatch note ──
  mismatchCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255,159,10,0.08)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,159,10,0.25)',
    marginBottom: 12,
  },
  mismatchText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#FFB84D',
    lineHeight: 19,
  },
  // ── Warning ──
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255,159,10,0.06)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,159,10,0.2)',
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 20,
  },
  // ── Update button ──
  updateButton: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  updateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 30,
    paddingVertical: 14,
    minHeight: 54,
  },
  updateButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  // ── Edit form ──
  cancelBtn: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.75)',
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#06B6D4',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(6,182,212,0.10)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.25)',
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 19,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#16112B',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(139,92,246,0.30)',
    paddingHorizontal: 18,
    paddingVertical: Platform.OS === 'ios' ? 15 : 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    },
  typeChipActive: {
      backgroundColor: 'rgba(139,92,246,0.18)',
      borderColor: '#8B2BE2',
  },
  typeChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255,255,255,0.55)',
  },
  typeChipTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  // ── Empty state ──
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: 22,
  },
  inputFocused: {
    borderColor: 'rgba(139, 92, 246, 0.80)',
  },
});

export default HostBankAccountScreen;
