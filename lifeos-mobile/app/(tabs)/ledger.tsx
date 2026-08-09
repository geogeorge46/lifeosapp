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
    <SafeAreaView className="flex-1 bg-black px-4 pt-4" edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        
        {/* Header */}
        <View className="mb-6 flex-row justify-between items-center">
          <View>
            <Text className="text-3xl font-extrabold text-white tracking-tight">Ledger</Text>
            <Text className="text-xs text-neutral-400 mt-1">Track expense patterns and outstanding balances.</Text>
          </View>
          <TouchableOpacity
            onPress={() => setIsSplitMode(!isSplitMode)}
            className={`px-3 py-2 rounded-xl flex-row items-center space-x-1 border ${
              isSplitMode ? "bg-amber-950 border-amber-900" : "bg-neutral-900 border-neutral-800"
            }`}
          >
            <Users size={12} color={isSplitMode ? "#fbbf24" : "#a3a3a3"} />
            <Text className={`text-[10px] font-bold ${isSplitMode ? "text-amber-400" : "text-neutral-300"}`}>
              {isSplitMode ? "Custom Record" : "Split Bill"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Financial Summary Grid Banner */}
        {summary && (
          <View className="flex-row space-x-3 mb-6">
            <View className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-3.5">
              <Text className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                Expenses
              </Text>
              <Text className="text-base font-extrabold text-white mt-1">
                {currencySymbol}{summary.totalExpense.toFixed(2)}
              </Text>
            </View>

            <View className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-3.5">
              <Text className="text-[9px] font-bold text-green-500 uppercase tracking-wider">
                Owed to you
              </Text>
              <Text className="text-base font-extrabold text-green-400 mt-1">
                +{currencySymbol}{summary.totalLentPending.toFixed(2)}
              </Text>
            </View>

            <View className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-3.5">
              <Text className="text-[9px] font-bold text-red-500 uppercase tracking-wider">
                You owe
              </Text>
              <Text className="text-base font-extrabold text-red-400 mt-1">
                -{currencySymbol}{summary.totalBorrowedPending.toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {/* Group Splits Console Form */}
        {isSplitMode ? (
          <View className="bg-neutral-900 border border-amber-950 rounded-3xl p-5 mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-base font-bold text-amber-400 flex-row items-center">
                🔥 Split Bill Console
              </Text>
              <TouchableOpacity onPress={() => setIsSplitMode(false)}>
                <X size={14} color="#737373" />
              </TouchableOpacity>
            </View>

            <View className="flex-row space-x-3 mb-3.5">
              <TextInput
                placeholder={`${currencySymbol} 0.00`}
                placeholderTextColor="#737373"
                value={splitTotal}
                onChangeText={setSplitTotal}
                keyboardType="numeric"
                className="w-24 text-white text-sm bg-neutral-950 rounded-xl px-4 py-3 border border-neutral-800 text-center"
              />
              <TextInput
                placeholder="Bill Description (e.g. Dinner split)"
                placeholderTextColor="#737373"
                value={splitDescription}
                onChangeText={setSplitDescription}
                className="flex-1 text-white text-sm bg-neutral-950 rounded-xl px-4 py-3 border border-neutral-800 text-left"
              />
            </View>

            {/* Split place link */}
            {places.length > 0 && (
              <View className="mb-3.5">
                <Text className="text-[10px] text-neutral-400 mb-1.5 flex-row items-center">
                  <MapPin size={10} color="#a3a3a3" className="mr-1" /> Split Location (Optional)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {places.map((place) => (
                    <TouchableOpacity
                      key={place.id}
                      onPress={() => setSplitPlaceId(splitPlaceId === place.id ? null : place.id)}
                      className={`px-3 py-1.5 rounded-lg border mr-2 ${
                        splitPlaceId === place.id ? "bg-amber-950/40 border-amber-900" : "bg-neutral-950 border-neutral-800"
                      }`}
                    >
                      <Text className="text-[10px] text-neutral-300">{place.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Split member contacts */}
            {people.length > 0 && (
              <View className="mb-4">
                <View className="flex-row justify-between items-center mb-1.5">
                  <Text className="text-[10px] text-neutral-400 flex-row items-center">
                    <User size={10} color="#a3a3a3" className="mr-1" /> Select split contacts
                  </Text>
                  {selectedSplitPeople.length > 0 && (
                    <TouchableOpacity onPress={handleSplitEqually}>
                      <Text className="text-[10px] text-amber-400 font-extrabold uppercase">Split Equally</Text>
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
                          isSelected ? "bg-amber-900 border-amber-700" : "bg-neutral-950 border-neutral-800"
                        }`}
                      >
                        <Text className="text-[10px] text-white">{person.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Individual share inputs */}
                {selectedSplitPeople.length > 0 && (
                  <View className="bg-neutral-950 p-3 rounded-2xl border border-neutral-850 space-y-2">
                    <Text className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                      Individual shares
                    </Text>
                    {selectedSplitPeople.map((pId) => {
                      const personName = people.find((p) => p.id === pId)?.name || "Contact";
                      return (
                        <View key={pId} className="flex-row justify-between items-center">
                          <Text className="text-xs text-neutral-300">{personName}</Text>
                          <TextInput
                            placeholder="$ 0.00"
                            placeholderTextColor="#555"
                            value={customSplitAmounts[pId] || ""}
                            onChangeText={(val) =>
                              setCustomSplitAmounts({ ...customSplitAmounts, [pId]: val })
                            }
                            keyboardType="numeric"
                            className="w-20 bg-neutral-900 border border-neutral-800 rounded-lg text-right text-white text-xs px-2.5 py-1.5"
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
              className="bg-amber-500 p-3.5 rounded-2xl flex items-center justify-center shadow-lg"
            >
              <Text className="text-black text-sm font-extrabold">Execute Group Split</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Standard Recording Form */
          <View className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 mb-6">
            <Text className="text-base font-bold text-white mb-3">Record Transaction</Text>

            {/* Segmented control type */}
            <View className="flex-row bg-neutral-950 border border-neutral-850 p-1 rounded-xl mb-3.5">
              {(["EXPENSE", "LENT", "BORROWED"] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center ${
                    type === t
                      ? t === "LENT"
                        ? "bg-green-950 border border-green-800"
                        : t === "BORROWED"
                        ? "bg-red-950 border border-red-800"
                        : "bg-neutral-800 border border-neutral-700"
                      : ""
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      type === t
                        ? t === "LENT"
                          ? "text-green-300"
                          : t === "BORROWED"
                          ? "text-red-300"
                          : "text-white"
                        : "text-neutral-500"
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
                placeholderTextColor="#737373"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                className="w-24 text-white text-sm bg-neutral-950 rounded-xl px-4 py-3 border border-neutral-800 text-center"
              />
              <TextInput
                placeholder="Description"
                placeholderTextColor="#737373"
                value={description}
                onChangeText={setDescription}
                className="flex-1 text-white text-sm bg-neutral-950 rounded-xl px-4 py-3 border border-neutral-800 text-left"
              />
            </View>

            {/* Category pills (Expense only) */}
            {type === "EXPENSE" && (
              <View className="mb-3.5">
                <Text className="text-[10px] text-neutral-400 mb-1.5">Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {PRESET_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg border mr-2 ${
                        category === cat
                          ? "bg-indigo-950 border-indigo-800 text-indigo-300"
                          : "bg-neutral-950 border-neutral-850"
                      }`}
                    >
                      <Text className={`text-[10px] ${category === cat ? "text-indigo-300 font-bold" : "text-neutral-400"}`}>
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
                <Text className="text-[10px] text-neutral-400 mb-1.5 flex-row items-center">
                  <MapPin size={10} color="#a3a3a3" className="mr-1" /> Place Link (Optional)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {places.map((place) => (
                    <TouchableOpacity
                      key={place.id}
                      onPress={() => setSelectedPlaceId(selectedPlaceId === place.id ? null : place.id)}
                      className={`px-3 py-1.5 rounded-lg border mr-2 ${
                        selectedPlaceId === place.id ? "bg-neutral-800 border-neutral-700" : "bg-neutral-950 border-neutral-850"
                      }`}
                    >
                      <Text className="text-[10px] text-neutral-300">{place.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Contact Person Selector (Lent / Borrowed only) */}
            {type !== "EXPENSE" && people.length > 0 && (
              <View className="mb-3.5">
                <Text className="text-[10px] text-neutral-400 mb-1.5 flex-row items-center">
                  <User size={10} color="#a3a3a3" className="mr-1" /> Choose Linked Contact
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {people.map((person) => (
                    <TouchableOpacity
                      key={person.id}
                      onPress={() => setSelectedPersonId(selectedPersonId === person.id ? null : person.id)}
                      className={`px-3 py-1.5 rounded-lg border mr-2 ${
                        selectedPersonId === person.id
                          ? type === "LENT"
                            ? "bg-green-950 border-green-800"
                            : "bg-red-950 border-red-800"
                          : "bg-neutral-950 border-neutral-850"
                      }`}
                    >
                      <Text className={`text-[10px] ${selectedPersonId === person.id ? (type === "LENT" ? "text-green-300 font-bold" : "text-red-300 font-bold") : "text-neutral-400"}`}>
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
                <Text className="text-[10px] text-neutral-400 mb-1.5 flex-row items-center">
                  <Calendar size={10} color="#a3a3a3" className="mr-1" /> Remind Due Date (YYYY-MM-DD - Optional)
                </Text>
                <TextInput
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#555"
                  value={dueDate}
                  onChangeText={setDueDate}
                  className="text-white text-[12px] bg-neutral-950 rounded-xl px-4 py-2 border border-neutral-800 text-left w-32"
                />
              </View>
            )}

            {/* Log submit */}
            <TouchableOpacity
              onPress={handleCreateTransaction}
              className="bg-indigo-600 p-3.5 rounded-2xl flex-row items-center justify-center shadow-lg"
            >
              <Plus size={18} color="#fff" />
              <Text className="text-white text-sm font-bold ml-1.5">Log Transaction</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tab filters */}
        <View className="flex-row space-x-2 border-b border-neutral-850 pb-3 mb-4">
          {(["ALL", "EXPENSES", "DEBTS"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg ${activeTab === tab ? "bg-neutral-800" : ""}`}
            >
              <Text className={`text-[10px] font-bold ${activeTab === tab ? "text-white" : "text-neutral-500"}`}>
                {tab === "DEBTS" ? "Debts (Owed/Owe)" : tab === "EXPENSES" ? "Expenses" : "All Records"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List of transaction records */}
        <View className="mb-10">
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" className="my-6" />
          ) : filteredTransactions.length === 0 ? (
            <View className="bg-neutral-950 border border-neutral-900 border-dashed rounded-2xl py-10 px-4 flex items-center justify-center">
              <Clock size={24} color="#404040" />
              <Text className="text-xs font-bold text-neutral-500 mt-2">No transaction logs</Text>
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
                  className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-3 shadow-sm"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <View className="flex-row items-center space-x-1.5">
                        {isExpense ? (
                          <View className="bg-neutral-800 border border-neutral-700 px-1.5 py-0.5 rounded">
                            <Text className="text-[8px] font-extrabold text-neutral-400">
                              {tx.category || "General"}
                            </Text>
                          </View>
                        ) : isOwed ? (
                          <ArrowUpRight size={13} color="#10B981" />
                        ) : (
                          <ArrowDownLeft size={13} color="#EF4444" />
                        )}
                        <Text className="text-white font-bold text-sm">{tx.description}</Text>
                      </View>

                      {/* Link Badges (Place & Person) */}
                      <View className="flex-row flex-wrap items-center gap-1.5 mt-2">
                        {!isExpense && tx.person && (
                          <View className="bg-neutral-950 border border-neutral-850 px-1.5 py-0.5 rounded flex-row items-center">
                            <User size={8} color="#a3a3a3" style={{ marginRight: 3 }} />
                            <Text className="text-[8px] text-neutral-400 font-bold">
                              {tx.person.name}
                            </Text>
                          </View>
                        )}
                        {tx.place && (
                          <View className="bg-neutral-950 border border-neutral-850 px-1.5 py-0.5 rounded flex-row items-center">
                            <MapPin size={8} color="#a3a3a3" style={{ marginRight: 3 }} />
                            <Text className="text-[8px] text-neutral-400 font-bold">
                              {tx.place.name}
                            </Text>
                          </View>
                        )}
                        {tx.dueDate && isPending && (
                          <View className="bg-amber-950/60 border border-amber-900 px-1.5 py-0.5 rounded flex-row items-center">
                            <Calendar size={8} color="#fbbf24" style={{ marginRight: 3 }} />
                            <Text className="text-[8px] text-amber-400 font-extrabold">
                              Due: {new Date(tx.dueDate).toLocaleDateString()}
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text className="text-[8px] text-neutral-600 mt-1.5">
                        Logged: {new Date(tx.createdAt).toLocaleDateString()}
                      </Text>
                    </View>

                    {/* Amount & Settlement options */}
                    <View className="flex-row items-center space-x-3.5">
                      <Text
                        className={`font-extrabold text-base ${
                          isExpense ? "text-white" : isOwed ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {isExpense ? "" : isOwed ? "+" : "-"}{currencySymbol}{parsedAmount.toFixed(2)}
                      </Text>

                      {!isExpense && (
                        <TouchableOpacity
                          onPress={() => handleOpenSettlePrompt(tx)}
                          className={`px-2 py-1 rounded-lg border flex-row items-center space-x-1 ${
                            !isPending
                              ? "bg-neutral-950 border-neutral-850"
                              : isOwed
                              ? "bg-green-950/40 border-green-900/60"
                              : "bg-red-950/40 border-red-900/60"
                          }`}
                        >
                          {!isPending ? (
                            <>
                              <CheckCircle size={10} color="#A3A3A3" />
                              <Text className="text-[8px] font-bold text-neutral-500 uppercase">
                                Settled
                              </Text>
                            </>
                          ) : (
                            <>
                              <Clock size={10} color={isOwed ? "#10B981" : "#EF4444"} />
                              <Text
                                className={`text-[8px] font-bold uppercase ${
                                  isOwed ? "text-green-400" : "text-red-400"
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
                        className="p-1.5 bg-neutral-950 border border-neutral-850 rounded-lg"
                      >
                        <Trash2 size={12} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Partial Payments History Under Card */}
                  {tx.partialPayments && tx.partialPayments.length > 0 && (
                    <View className="mt-2.5 pt-2.5 border-t border-neutral-850">
                      <Text className="text-[9px] font-extrabold text-neutral-500 uppercase tracking-wider mb-1">
                        Repayments History
                      </Text>
                      {tx.partialPayments.map((subPay) => (
                        <View key={subPay.id} className="flex-row justify-between items-center py-1">
                          <Text className="text-[9px] text-neutral-400">
                            ✓ Payment received ({new Date(subPay.settledAt || subPay.createdAt).toLocaleDateString()})
                          </Text>
                          <Text className="text-[9px] font-bold text-green-400">
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
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.8)" }}>
          <View className="bg-neutral-900 border-t border-t-neutral-800 p-6 rounded-t-3xl">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-base font-bold text-white">Settle Transaction</Text>
              <TouchableOpacity onPress={() => setSettleModalVisible(false)}>
                <X size={16} color="#737373" />
              </TouchableOpacity>
            </View>

            {settlingTx && (
              <View className="mb-5 bg-neutral-950 p-4 border border-neutral-850 rounded-2xl">
                <Text className="text-xs text-neutral-400">Outstanding Balance:</Text>
                <Text className="text-2xl font-extrabold text-white mt-1">
                  {currencySymbol}{parseFloat(settlingTx.amount).toFixed(2)}
                </Text>
                <Text className="text-xs text-neutral-500 mt-1">
                  For: {settlingTx.description}
                </Text>
              </View>
            )}

            {/* Settle Entire Balance Button */}
            <TouchableOpacity
              onPress={handleConfirmFullSettle}
              className="bg-green-600 p-4 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
            >
              <Text className="text-white text-sm font-extrabold">Settle Full Outstanding Balance</Text>
            </TouchableOpacity>

            <Text className="text-[10px] text-neutral-500 mb-2">Or post a partial repayment:</Text>
            
            <View className="flex-row space-x-3 mb-6">
              <TextInput
                placeholder={`${currencySymbol} Paid amount`}
                placeholderTextColor="#555"
                value={partialSettleAmount}
                onChangeText={setPartialSettleAmount}
                keyboardType="numeric"
                className="flex-1 text-white text-sm bg-neutral-950 border border-neutral-850 rounded-xl px-4 py-3 text-left"
              />
              <TouchableOpacity
                onPress={handleConfirmPartialSettle}
                className="bg-neutral-800 border border-neutral-700 px-5 rounded-xl items-center justify-center"
              >
                <Text className="text-neutral-300 text-xs font-bold">Apply Portional</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
