import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  DollarSign,
  Landmark,
  User,
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle,
  Clock,
  Users,
  MapPin,
  Calendar,
  CheckCircle2,
  X,
} from "lucide-react-native";
import { useLedgerStore } from "../../src/store/ledgerStore";
import { usePeopleStore } from "../../src/store/peopleStore";
import { usePlacesStore } from "../../src/store/placesStore";
import { useSettingsStore } from "../../src/store/settingsStore";
import { Transaction } from "../../src/services/api";

const PRESET_CATEGORIES = ["Food", "Travel", "Bills", "Shopping", "Entertainment", "Health", "General"];

export default function LedgerScreen() {
  const {
    transactions,
    summary,
    isLoading,
    fetchTransactions,
    fetchSummary,
    addTransaction,
    settleTransaction,
    splitExpense,
    deleteTransaction,
  } = useLedgerStore();

  const { people, fetchPeople } = usePeopleStore();
  const { places, fetchPlaces } = usePlacesStore();
  const { currencySymbol } = useSettingsStore();

  // Navigation Filter Tab
  const [activeTab, setActiveTab] = useState<"ALL" | "EXPENSES" | "DEBTS">("ALL");

  // Create Transaction Form states
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"EXPENSE" | "LENT" | "BORROWED">("EXPENSE");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [category, setCategory] = useState("General");
  const [dueDate, setDueDate] = useState("");

  // Group Splits Form states
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitTotal, setSplitTotal] = useState("");
  const [splitDescription, setSplitDescription] = useState("");
  const [splitPlaceId, setSplitPlaceId] = useState<string | null>(null);
  const [selectedSplitPeople, setSelectedSplitPeople] = useState<string[]>([]);
  const [customSplitAmounts, setCustomSplitAmounts] = useState<Record<string, string>>({});

  // Settlement Prompt Modal states
  const [settleModalVisible, setSettleModalVisible] = useState(false);
  const [settlingTx, setSettlingTx] = useState<Transaction | null>(null);
  const [partialSettleAmount, setPartialSettleAmount] = useState("");

  useEffect(() => {
    fetchTransactions();
    fetchSummary();
    fetchPeople();
    fetchPlaces();
  }, []);

  const handleCreateTransaction = async () => {
    if (!amount.trim() || !description.trim()) {
      Alert.alert("Validation Error", "Amount and Description are required.");
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert("Validation Error", "Please provide a valid positive amount.");
      return;
    }

    if ((type === "LENT" || type === "BORROWED") && !selectedPersonId) {
      Alert.alert("Validation Error", "Lent or Borrowed transactions require choosing a contact person.");
      return;
    }

    if (dueDate.trim() && !dueDate.trim().match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert("Validation Error", "Due Date must be in YYYY-MM-DD format.");
      return;
    }

    try {
      await addTransaction(
        numericAmount,
        type,
        description.trim(),
        type !== "EXPENSE" ? selectedPersonId : null,
        selectedPlaceId,
        type === "EXPENSE" ? category : null,
        dueDate.trim() || null
      );

      // Reset states
      setAmount("");
      setDescription("");
      setSelectedPersonId(null);
      setSelectedPlaceId(null);
      setDueDate("");
      setCategory("General");
      Alert.alert("Success", "Transaction logged successfully!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to log transaction");
    }
  };

  const handleSplitEqually = () => {
    if (!splitTotal.trim()) return;
    const total = parseFloat(splitTotal);
    if (isNaN(total) || total <= 0 || selectedSplitPeople.length === 0) return;

    // Divide split amount equally among self + split people (selectedSplitPeople.length + 1)
    const divisor = selectedSplitPeople.length + 1;
    const share = (total / divisor).toFixed(2);

    const amounts: Record<string, string> = {};
    selectedSplitPeople.forEach((pId) => {
      amounts[pId] = share;
    });
    setCustomSplitAmounts(amounts);
  };

  const handleProcessSplit = async () => {
    if (!splitTotal.trim() || !splitDescription.trim()) {
      Alert.alert("Validation Error", "Total Amount and Description are required.");
      return;
    }

    const total = parseFloat(splitTotal);
    if (isNaN(total) || total <= 0) {
      Alert.alert("Validation Error", "Please provide a valid positive total amount.");
      return;
    }

    if (selectedSplitPeople.length === 0) {
      Alert.alert("Validation Error", "Please select at least one contact to split with.");
      return;
    }

    const splitsList = selectedSplitPeople.map((personId) => {
      const amtStr = customSplitAmounts[personId] || "0";
      const amt = parseFloat(amtStr);
      return { personId, amount: isNaN(amt) ? 0 : amt };
    });

    const sumOfSplits = splitsList.reduce((acc, s) => acc + s.amount, 0);
    if (sumOfSplits > total) {
      Alert.alert("Validation Error", "Split shares sum cannot exceed total bill amount.");
      return;
    }

    try {
      await splitExpense(total, splitDescription.trim(), splitPlaceId, splitsList);
      
      // Reset split states
      setSplitTotal("");
      setSplitDescription("");
      setSplitPlaceId(null);
      setSelectedSplitPeople([]);
      setCustomSplitAmounts({});
      setIsSplitMode(false);

      Alert.alert("Success", "Split transactions logged!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to log group splits");
    }
  };

  const handleOpenSettlePrompt = (tx: Transaction) => {
    setSettlingTx(tx);
    setPartialSettleAmount("");
    setSettleModalVisible(true);
  };

  const handleConfirmFullSettle = async () => {
    if (!settlingTx) return;
    try {
      await settleTransaction(settlingTx.id);
      setSettleModalVisible(false);
      setSettlingTx(null);
      Alert.alert("Success", "Transaction settled fully.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to settle transaction");
    }
  };

  const handleConfirmPartialSettle = async () => {
    if (!settlingTx || !partialSettleAmount.trim()) return;
    const partial = parseFloat(partialSettleAmount);
    if (isNaN(partial) || partial <= 0) {
      Alert.alert("Validation Error", "Please specify a valid positive partial payment.");
      return;
    }

    const txAmount = parseFloat(settlingTx.amount);
    if (partial >= txAmount) {
      // Treat as full settle
      handleConfirmFullSettle();
      return;
    }

    try {
      await settleTransaction(settlingTx.id, partial);
      setSettleModalVisible(false);
      setSettlingTx(null);
      setPartialSettleAmount("");
      Alert.alert("Success", `Logged partial payment of $${partial.toFixed(2)}.`);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to post partial payment");
    }
  };

  // Filter transactions according to tabs
  const filteredTransactions = transactions.filter((tx) => {
    if (activeTab === "EXPENSES") return tx.type === "EXPENSE";
    if (activeTab === "DEBTS") return tx.type === "LENT" || tx.type === "BORROWED";
    return true; // ALL
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F0F4F8" }} edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }} className="flex-1">
        
        {/* Header */}
        <View className="mb-6 flex-row justify-between items-center px-4 pt-4">
          <View>
            <Text className="text-3xl font-extrabold text-[#0F172A] tracking-tight">Ledger</Text>
            <Text className="text-xs text-[#64748B] mt-1 font-semibold">Track expense patterns and outstanding balances.</Text>
          </View>
          <TouchableOpacity
            onPress={() => setIsSplitMode(!isSplitMode)}
            className={`px-3.5 py-2.5 rounded-xl flex-row items-center space-x-1.5 border ${
              isSplitMode ? "bg-[#202E4E] border-[#202E4E] shadow-sm shadow-[#202E4E]/20" : "bg-white border-[#E2E8F0] shadow-sm shadow-[#0F172A]/5"
            }`}
          >
            <Users size={12} color={isSplitMode ? "#FFFFFF" : "#64748B"} />
            <Text className={`text-[10px] font-bold ${isSplitMode ? "text-white" : "text-[#64748B]"}`}>
              {isSplitMode ? "Custom Record" : "Split Bill"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Financial Summary Grid Banner */}
        {summary && (
          <View className="flex-row space-x-3 mb-6 px-4">
            <View className="flex-1 bg-white border border-[#E2E8F0] rounded-2xl p-3.5 shadow-sm shadow-[#0F172A]/5">
              <Text className="text-[9px] font-black text-[#64748B] uppercase tracking-wider">
                Expenses
              </Text>
              <Text className="text-base font-black text-[#0F172A] mt-1">
                {currencySymbol}{summary.totalExpense.toFixed(2)}
              </Text>
            </View>

            <View className="flex-1 bg-white border border-[#E2E8F0] rounded-2xl p-3.5 shadow-sm shadow-[#0F172A]/5">
              <Text className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">
                Owed to you
              </Text>
              <Text className="text-base font-black text-emerald-600 mt-1">
                +{currencySymbol}{summary.totalLentPending.toFixed(2)}
              </Text>
            </View>

            <View className="flex-1 bg-white border border-[#E2E8F0] rounded-2xl p-3.5 shadow-sm shadow-[#0F172A]/5">
              <Text className="text-[9px] font-black text-rose-700 uppercase tracking-wider">
                You owe
              </Text>
              <Text className="text-base font-black text-rose-600 mt-1">
                -{currencySymbol}{summary.totalBorrowedPending.toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {/* Visual Analytics Section: Category Distribution & Net Debt Breakdown */}
        {transactions.length > 0 && (
          <View className="mb-6 mx-4 space-y-4">
            {/* Category Expense Breakdown Bars */}
            {(() => {
              const expenseTxs = transactions.filter((t) => t.type === "EXPENSE");
              if (expenseTxs.length === 0) return null;

              const categoryTotals: Record<string, number> = {};
              let grandTotal = 0;

              expenseTxs.forEach((t) => {
                const cat = t.category || "General";
                const amt = parseFloat(t.amount);
                if (!isNaN(amt)) {
                  categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
                  grandTotal += amt;
                }
              });

              if (grandTotal === 0) return null;

              const categoriesList = Object.keys(categoryTotals)
                .map((cat) => ({
                  category: cat,
                  total: categoryTotals[cat],
                  percentage: Math.round((categoryTotals[cat] / grandTotal) * 100),
                }))
                .sort((a, b) => b.total - a.total);

              const CATEGORY_COLORS: Record<string, string> = {
                Food: "#F59E0B",
                Travel: "#3B82F6",
                Bills: "#8B5CF6",
                Shopping: "#10B981",
                Entertainment: "#EC4899",
                Health: "#EF4444",
                General: "#64748B",
              };

              return (
                <View className="bg-white border border-[#E2E8F0] rounded-3xl p-5 mb-4 shadow-sm shadow-[#0F172A]/5">
                  <Text className="text-sm font-extrabold text-[#0F172A] mb-3">
                    📊 Expense Category Breakdown
                  </Text>
                  <View className="space-y-2.5">
                    {categoriesList.map((item) => {
                      const barColor = CATEGORY_COLORS[item.category] || "#64748B";
                      return (
                        <View key={item.category} className="mb-2">
                          <View className="flex-row justify-between items-center mb-1">
                            <Text className="text-xs font-bold text-[#0F172A]">{item.category}</Text>
                            <Text className="text-xs font-extrabold text-[#64748B]">
                              {currencySymbol}{item.total.toFixed(2)} ({item.percentage}%)
                            </Text>
                          </View>
                          {/* Progress bar */}
                          <View className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <View
                              style={{
                                width: `${item.percentage}%`,
                                backgroundColor: barColor,
                              }}
                              className="h-full rounded-full"
                            />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })()}

            {/* Who Owes You vs Who You Owe Summary Card */}
            {(() => {
              const pendingLent = transactions.filter((t) => t.type === "LENT" && t.status === "PENDING" && t.person);
              const pendingBorrowed = transactions.filter((t) => t.type === "BORROWED" && t.status === "PENDING" && t.person);

              if (pendingLent.length === 0 && pendingBorrowed.length === 0) return null;

              return (
                <View className="bg-white border border-[#E2E8F0] rounded-3xl p-5 shadow-sm shadow-[#0F172A]/5">
                  <Text className="text-sm font-extrabold text-[#0F172A] mb-3">
                    💳 Outstanding Debt Summary
                  </Text>

                  {/* People who owe you */}
                  {pendingLent.length > 0 && (
                    <View className="mb-3">
                      <Text className="text-[10px] font-black text-emerald-700 uppercase tracking-wider mb-2">
                        Owed To You ({pendingLent.length})
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-2">
                        {pendingLent.map((tx) => (
                          <TouchableOpacity
                            key={tx.id}
                            onPress={() => handleOpenSettlePrompt(tx)}
                            className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 w-36 mr-2"
                          >
                            <View className="flex-row items-center justify-between mb-1">
                              <Text className="text-xs font-bold text-emerald-900" numberOfLines={1}>
                                {tx.person?.name}
                              </Text>
                            </View>
                            <Text className="text-sm font-black text-emerald-700">
                              +{currencySymbol}{parseFloat(tx.amount).toFixed(2)}
                            </Text>
                            <Text className="text-[9px] text-emerald-600 font-semibold mt-1" numberOfLines={1}>
                              {tx.description}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* People you owe */}
                  {pendingBorrowed.length > 0 && (
                    <View>
                      <Text className="text-[10px] font-black text-rose-700 uppercase tracking-wider mb-2">
                        You Owe ({pendingBorrowed.length})
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-2">
                        {pendingBorrowed.map((tx) => (
                          <TouchableOpacity
                            key={tx.id}
                            onPress={() => handleOpenSettlePrompt(tx)}
                            className="bg-rose-50 border border-rose-100 rounded-2xl p-3 w-36 mr-2"
                          >
                            <View className="flex-row items-center justify-between mb-1">
                              <Text className="text-xs font-bold text-rose-900" numberOfLines={1}>
                                {tx.person?.name}
                              </Text>
                            </View>
                            <Text className="text-sm font-black text-rose-700">
                              -{currencySymbol}{parseFloat(tx.amount).toFixed(2)}
                            </Text>
                            <Text className="text-[9px] text-rose-600 font-semibold mt-1" numberOfLines={1}>
                              {tx.description}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              );
            })()}
          </View>
        )}

        {/* Group Splits Console Form */}
        {isSplitMode ? (
          <View className="bg-white border border-[#E2E8F0] rounded-3xl p-5 mb-6 mx-4 shadow-sm shadow-[#0F172A]/5">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-base font-extrabold text-[#0F172A] flex-row items-center">
                🔥 Split Bill Console
              </Text>
              <TouchableOpacity onPress={() => setIsSplitMode(false)}>
                <X size={14} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View className="flex-row space-x-3 mb-3.5">
              <TextInput
                placeholder={`${currencySymbol} 0.00`}
                placeholderTextColor="#94A3B8"
                value={splitTotal}
                onChangeText={setSplitTotal}
                keyboardType="numeric"
                className="w-24 text-[#0F172A] text-sm bg-[#F8FAFC] rounded-xl px-4 py-3 border border-[#E2E8F0] text-center font-semibold"
              />
              <TextInput
                placeholder="Bill Description (e.g. Dinner split)"
                placeholderTextColor="#94A3B8"
                value={splitDescription}
                onChangeText={setSplitDescription}
                className="flex-1 text-[#0F172A] text-sm bg-[#F8FAFC] rounded-xl px-4 py-3 border border-[#E2E8F0] text-left font-semibold"
              />
            </View>

            {/* Split place link */}
            {places.length > 0 && (
              <View className="mb-3.5">
                <Text className="text-[10px] text-[#64748B] mb-1.5 flex-row items-center font-bold">
                  <MapPin size={10} color="#64748B" className="mr-1" /> Split Location (Optional)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {places.map((place) => (
                    <TouchableOpacity
                      key={place.id}
                      onPress={() => setSplitPlaceId(splitPlaceId === place.id ? null : place.id)}
                      className={`px-3 py-1.5 rounded-lg border mr-2 ${
                        splitPlaceId === place.id ? "bg-[#202E4E] border-[#202E4E] shadow-sm shadow-[#202E4E]/20" : "bg-[#F8FAFC] border-[#E2E8F0]"
                      }`}
                    >
                      <Text className={`text-[10px] ${splitPlaceId === place.id ? "text-white font-bold" : "text-[#64748B]"}`}>{place.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Split member contacts */}
            {people.length > 0 && (
              <View className="mb-4">
                <View className="flex-row justify-between items-center mb-1.5">
                  <Text className="text-[10px] text-[#64748B] flex-row items-center font-bold">
                    <User size={10} color="#64748B" className="mr-1" /> Select split contacts
                  </Text>
                  {selectedSplitPeople.length > 0 && (
                    <TouchableOpacity onPress={handleSplitEqually}>
                      <Text className="text-[10px] text-[#E05646] font-extrabold uppercase">Split Equally</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3.5">
                  {people.map((person) => {
                    const isSelected = selectedSplitPeople.includes(person.id);
                    return (
                      <TouchableOpacity
                        key={person.id}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedSplitPeople(selectedSplitPeople.filter((id) => id !== person.id));
                          } else {
                            setSelectedSplitPeople([...selectedSplitPeople, person.id]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg border mr-2 ${
                          isSelected ? "bg-[#202E4E] border-[#202E4E] shadow-sm shadow-[#202E4E]/20" : "bg-[#F8FAFC] border-[#E2E8F0]"
                        }`}
                      >
                        <Text className={`text-[10px] ${isSelected ? "text-white font-bold" : "text-[#64748B]"}`}>{person.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Individual share inputs */}
                {selectedSplitPeople.length > 0 && (
                  <View className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#E2E8F0] space-y-2">
                    <Text className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
                      Individual shares
                    </Text>
                    {selectedSplitPeople.map((pId) => {
                      const personName = people.find((p) => p.id === pId)?.name || "Contact";
                      return (
                        <View key={pId} className="flex-row justify-between items-center">
                          <Text className="text-xs text-[#0F172A] font-bold">{personName}</Text>
                          <TextInput
                            placeholder="$ 0.00"
                            placeholderTextColor="#94A3B8"
                            value={customSplitAmounts[pId] || ""}
                            onChangeText={(val) =>
                              setCustomSplitAmounts({ ...customSplitAmounts, [pId]: val })
                            }
                            keyboardType="numeric"
                            className="w-20 bg-white border border-[#E2E8F0] rounded-lg text-right text-[#0F172A] text-xs px-2.5 py-1.5 font-semibold"
                          />
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              onPress={handleProcessSplit}
              className="bg-[#E05646] p-3.5 rounded-2xl flex items-center justify-center shadow-md shadow-[#E05646]/20"
            >
              <Text className="text-white text-sm font-extrabold">Execute Group Split</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Standard Recording Form */
          <View className="bg-white border border-[#E2E8F0] rounded-3xl p-5 mb-6 mx-4 shadow-sm shadow-[#0F172A]/5">
            <Text className="text-base font-extrabold text-[#0F172A] mb-3">Record Transaction</Text>

            {/* Segmented control type */}
            <View className="flex-row bg-[#F8FAFC] border border-[#E2E8F0] p-1 rounded-xl mb-3.5">
              {(["EXPENSE", "LENT", "BORROWED"] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center ${
                    type === t
                      ? t === "LENT"
                        ? "bg-emerald-500 border border-emerald-500 shadow-sm"
                        : t === "BORROWED"
                        ? "bg-rose-500 border border-rose-500 shadow-sm"
                        : "bg-white border border-[#E2E8F0] shadow-sm"
                      : ""
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      type === t
                        ? "text-white"
                        : "text-[#64748B]"
                    }`}
                  >
                    {t === "LENT" ? "Owed to me" : t === "BORROWED" ? "I owe" : "Expense"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Inputs */}
            <View className="flex-row space-x-3 mb-3.5">
              <TextInput
                placeholder={`${currencySymbol} 0.00`}
                placeholderTextColor="#94A3B8"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                className="w-24 text-[#0F172A] text-sm bg-[#F8FAFC] rounded-xl px-4 py-3 border border-[#E2E8F0] text-center font-semibold"
              />
              <TextInput
                placeholder="Description"
                placeholderTextColor="#94A3B8"
                value={description}
                onChangeText={setDescription}
                className="flex-1 text-[#0F172A] text-sm bg-[#F8FAFC] rounded-xl px-4 py-3 border border-[#E2E8F0] text-left font-semibold"
              />
            </View>

            {/* Category pills (Expense only) */}
            {type === "EXPENSE" && (
              <View className="mb-3.5">
                <Text className="text-[10px] text-[#64748B] mb-1.5 font-bold">Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {PRESET_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg border mr-2 ${
                        category === cat
                          ? "bg-[#202E4E] border-[#202E4E]"
                          : "bg-[#F8FAFC] border-[#E2E8F0]"
                      }`}
                    >
                      <Text className={`text-[10px] ${category === cat ? "text-white font-bold" : "text-[#64748B]"}`}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Places linking selector */}
            {places.length > 0 && (
              <View className="mb-3.5">
                <Text className="text-[10px] text-[#64748B] mb-1.5 flex-row items-center font-bold">
                  <MapPin size={10} color="#64748B" className="mr-1" /> Place Link (Optional)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {places.map((place) => (
                    <TouchableOpacity
                      key={place.id}
                      onPress={() => setSelectedPlaceId(selectedPlaceId === place.id ? null : place.id)}
                      className={`px-3 py-1.5 rounded-lg border mr-2 ${
                        selectedPlaceId === place.id ? "bg-[#202E4E] border-[#202E4E]" : "bg-[#F8FAFC] border-[#E2E8F0]"
                      }`}
                    >
                      <Text className={`text-[10px] ${selectedPlaceId === place.id ? "text-white font-bold" : "text-[#64748B]"}`}>{place.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Contact Person Selector (Lent / Borrowed only) */}
            {type !== "EXPENSE" && people.length > 0 && (
              <View className="mb-3.5">
                <Text className="text-[10px] text-[#64748B] mb-1.5 flex-row items-center font-bold">
                  <User size={10} color="#64748B" className="mr-1" /> Choose Linked Contact
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {people.map((person) => (
                    <TouchableOpacity
                      key={person.id}
                      onPress={() => setSelectedPersonId(selectedPersonId === person.id ? null : person.id)}
                      className={`px-3 py-1.5 rounded-lg border mr-2 ${
                        selectedPersonId === person.id
                          ? type === "LENT"
                            ? "bg-emerald-500 border border-emerald-500"
                            : "bg-rose-500 border border-rose-500"
                          : "bg-[#F8FAFC] border-[#E2E8F0]"
                      }`}
                    >
                      <Text className={`text-[10px] ${selectedPersonId === person.id ? "text-white font-bold" : "text-[#64748B]"}`}>
                        {person.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Due date follow-up trigger (Lent/Borrowed only) */}
            {type !== "EXPENSE" && (
              <View className="mb-4">
                <Text className="text-[10px] text-[#64748B] mb-1.5 flex-row items-center font-bold">
                  <Calendar size={10} color="#64748B" className="mr-1" /> Remind Due Date (YYYY-MM-DD - Optional)
                </Text>
                <TextInput
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                  value={dueDate}
                  onChangeText={setDueDate}
                  className="text-[#0F172A] text-[12px] bg-[#F8FAFC] rounded-xl px-4 py-2 border border-[#E2E8F0] text-left w-32 font-semibold"
                />
              </View>
            )}

            {/* Log submit */}
            <TouchableOpacity
              onPress={handleCreateTransaction}
              className="bg-[#E05646] p-3.5 rounded-2xl flex-row items-center justify-center shadow-md shadow-[#E05646]/20"
            >
              <Plus size={18} color="#FFFFFF" />
              <Text className="text-white text-sm font-bold ml-1.5">Log Transaction</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tab filters */}
        <View className="flex-row space-x-2 border-b border-[#E2E8F0] pb-3 mb-4 mx-4">
          {(["ALL", "EXPENSES", "DEBTS"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg ${activeTab === tab ? "bg-white border border-[#E2E8F0] shadow-sm" : ""}`}
            >
              <Text className={`text-[10px] font-bold ${activeTab === tab ? "text-[#0F172A]" : "text-[#64748B]"}`}>
                {tab === "DEBTS" ? "Debts (Owed/Owe)" : tab === "EXPENSES" ? "Expenses" : "All Records"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List of transaction records */}
        <View className="mb-10 mx-4">
          {isLoading ? (
            <ActivityIndicator size="small" color="#E05646" className="my-6" />
          ) : filteredTransactions.length === 0 ? (
            <View className="bg-white border border-[#E2E8F0] border-dashed rounded-2xl py-10 px-4 flex items-center justify-center">
              <Clock size={24} color="#94A3B8" />
              <Text className="text-xs font-bold text-[#0F172A] mt-2">No transaction logs</Text>
            </View>
          ) : (
            filteredTransactions.map((tx) => {
              const parsedAmount = parseFloat(tx.amount);
              const isOwed = tx.type === "LENT";
              const isExpense = tx.type === "EXPENSE";
              const isPending = tx.status === "PENDING";

              return (
                <View
                  key={tx.id}
                  className="bg-white border border-[#E2E8F0] rounded-2xl p-4 mb-3 shadow-sm shadow-[#0F172A]/5"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <View className="flex-row items-center space-x-1.5">
                        {isExpense ? (
                          <View className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                            <Text className="text-[8px] font-extrabold text-[#64748B]">
                              {tx.category || "General"}
                            </Text>
                          </View>
                        ) : isOwed ? (
                          <ArrowUpRight size={13} color="#10B981" />
                        ) : (
                          <ArrowDownLeft size={13} color="#EF4444" />
                        )}
                        <Text className="text-[#0F172A] font-bold text-sm">{tx.description}</Text>
                      </View>

                      {/* Link Badges (Place & Person) */}
                      <View className="flex-row flex-wrap items-center gap-1.5 mt-2">
                        {!isExpense && tx.person && (
                          <View className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded flex-row items-center">
                            <User size={8} color="#64748B" style={{ marginRight: 3 }} />
                            <Text className="text-[8px] text-[#64748B] font-bold">
                              {tx.person.name}
                            </Text>
                          </View>
                        )}
                        {tx.place && (
                          <View className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded flex-row items-center">
                            <MapPin size={8} color="#64748B" style={{ marginRight: 3 }} />
                            <Text className="text-[8px] text-[#64748B] font-bold">
                              {tx.place.name}
                            </Text>
                          </View>
                        )}
                        {tx.dueDate && isPending && (
                          <View className="bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex-row items-center">
                            <Calendar size={8} color="#D97706" style={{ marginRight: 3 }} />
                            <Text className="text-[8px] text-amber-700 font-extrabold">
                              Due: {new Date(tx.dueDate).toLocaleDateString()}
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text className="text-[8px] text-[#94A3B8] mt-1.5 font-bold">
                        Logged: {new Date(tx.createdAt).toLocaleDateString()}
                      </Text>
                    </View>

                    {/* Amount & Settlement options */}
                    <View className="flex-row items-center space-x-3.5">
                      <Text
                        className={`font-black text-base ${
                          isExpense ? "text-[#0F172A]" : isOwed ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {isExpense ? "" : isOwed ? "+" : "-"}{currencySymbol}{parsedAmount.toFixed(2)}
                      </Text>

                      {!isExpense && (
                        <TouchableOpacity
                           onPress={() => handleOpenSettlePrompt(tx)}
                          className={`px-2 py-1 rounded-lg border flex-row items-center space-x-1 ${
                            !isPending
                              ? "bg-slate-50 border-slate-100"
                              : isOwed
                              ? "bg-emerald-50 border-emerald-100"
                              : "bg-rose-50 border-rose-100"
                          }`}
                        >
                          {!isPending ? (
                            <>
                              <CheckCircle size={10} color="#94A3B8" />
                              <Text className="text-[8px] font-bold text-[#94A3B8] uppercase">
                                Settled
                              </Text>
                            </>
                          ) : (
                            <>
                              <Clock size={10} color={isOwed ? "#10B981" : "#EF4444"} />
                              <Text
                                className={`text-[8px] font-bold uppercase ${
                                  isOwed ? "text-emerald-700" : "text-rose-700"
                                }`}
                              >
                                Settle
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        onPress={() => deleteTransaction(tx.id)}
                        className="p-2 bg-red-50 border border-red-100 rounded-lg"
                      >
                        <Trash2 size={13} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Partial Payments History Under Card */}
                  {tx.partialPayments && tx.partialPayments.length > 0 && (
                    <View className="mt-2.5 pt-2.5 border-t border-[#E2E8F0]">
                      <Text className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
                        Repayments History
                      </Text>
                      {tx.partialPayments.map((subPay) => (
                        <View key={subPay.id} className="flex-row justify-between items-center py-1">
                          <Text className="text-[9px] text-[#0F172A] font-bold">
                            ✓ Payment received ({new Date(subPay.settledAt || subPay.createdAt).toLocaleDateString()})
                          </Text>
                          <Text className="text-[9px] font-extrabold text-emerald-600">
                            {currencySymbol}{parseFloat(subPay.amount).toFixed(2)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Settle Prompt Modal (Full / Partial) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={settleModalVisible}
        onRequestClose={() => setSettleModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 23, 42, 0.3)" }}>
          <View className="bg-white border-t border-t-[#E2E8F0] p-6 rounded-t-3xl shadow-2xl">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-base font-extrabold text-[#0F172A]">Settle Transaction</Text>
              <TouchableOpacity onPress={() => setSettleModalVisible(false)}>
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            </View>

            {settlingTx && (
              <View className="mb-5 bg-[#F8FAFC] p-4 border border-[#E2E8F0] rounded-2xl">
                <Text className="text-xs text-[#64748B] font-bold">Outstanding Balance:</Text>
                <Text className="text-2xl font-black text-[#0F172A] mt-1">
                  {currencySymbol}{parseFloat(settlingTx.amount).toFixed(2)}
                </Text>
                <Text className="text-xs text-[#64748B] mt-1 font-medium">
                  For: {settlingTx.description}
                </Text>
              </View>
            )}

            {/* Settle Entire Balance Button */}
            <TouchableOpacity
              onPress={handleConfirmFullSettle}
              className="bg-[#E05646] p-4 rounded-2xl flex items-center justify-center mb-4 shadow-md shadow-[#E05646]/20"
            >
              <Text className="text-white text-sm font-extrabold">Settle Full Outstanding Balance</Text>
            </TouchableOpacity>

            <Text className="text-[10px] text-[#64748B] mb-2 font-bold">Or post a partial repayment:</Text>
            
            <View className="flex-row space-x-3 mb-6">
              <TextInput
                placeholder={`${currencySymbol} Paid amount`}
                placeholderTextColor="#94A3B8"
                value={partialSettleAmount}
                onChangeText={setPartialSettleAmount}
                keyboardType="numeric"
                className="flex-1 text-[#0F172A] text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-left"
              />
              <TouchableOpacity
                onPress={handleConfirmPartialSettle}
                className="bg-[#202E4E] border border-[#202E4E] px-5 rounded-xl items-center justify-center shadow-sm"
              >
                <Text className="text-white text-xs font-bold">Apply Portional</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
