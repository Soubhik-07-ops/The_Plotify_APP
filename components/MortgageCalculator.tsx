import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, PieChart } from 'react-native-chart-kit';
import icons from '@/constants/icons';
import { Image } from 'react-native';
import { palette } from '@/constants/theme';
import { formatPriceINR, formatCurrencyINR } from '@/lib/formatters';

const { width } = Dimensions.get('window');

interface MortgageCalculatorProps {
  visible: boolean;
  onClose: () => void;
  propertyPrice?: number;
}

const MortgageCalculator = ({ visible, onClose, propertyPrice = 400000 }: MortgageCalculatorProps) => {
  const [activeTab, setActiveTab] = useState<'calculator' | 'affordability'>('calculator');

  // Calculator inputs
  const [homePrice, setHomePrice] = useState(propertyPrice.toString());
  const [downPayment, setDownPayment] = useState((propertyPrice * 0.2).toString());
  const [interestRate, setInterestRate] = useState('6.5');
  const [loanTerm, setLoanTerm] = useState('30');
  const [propertyTax, setPropertyTax] = useState('1.2');
  const [homeInsurance, setHomeInsurance] = useState('0.5');

  // Affordability inputs
  const [annualIncome, setAnnualIncome] = useState('80000');
  const [monthlyDebts, setMonthlyDebts] = useState('500');

  // Results
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [maxAffordablePrice, setMaxAffordablePrice] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [amortizationData, setAmortizationData] = useState<any[]>([]);

  // Calculate mortgage payment
  const calculateMortgage = () => {
    const principal = parseFloat(homePrice) - parseFloat(downPayment);
    const rate = parseFloat(interestRate) / 100 / 12;
    const term = parseInt(loanTerm) * 12;

    if (principal <= 0 || rate <= 0 || term <= 0) return;

    const monthlyPayment = principal * (rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1);
    const monthlyTax = (parseFloat(homePrice) * parseFloat(propertyTax) / 100) / 12;
    const monthlyInsurance = (parseFloat(homePrice) * parseFloat(homeInsurance) / 100) / 12;

    const totalMonthlyPayment = monthlyPayment + monthlyTax + monthlyInsurance;
    setMonthlyPayment(totalMonthlyPayment);

    // Calculate total interest and cost
    const totalPayments = totalMonthlyPayment * term;
    const totalInterestPaid = totalPayments - principal;
    setTotalInterest(totalInterestPaid);
    setTotalCost(totalPayments);

    // Generate amortization data for chart
    generateAmortizationData(principal, rate, term, totalMonthlyPayment);
  };

  const generateAmortizationData = (principal: number, rate: number, term: number, monthlyPayment: number) => {
    const data = [];
    let balance = principal;

    for (let year = 1; year <= Math.min(term / 12, 30); year++) {
      const yearPayment = monthlyPayment * 12;
      const yearInterest = balance * rate * 12;
      const yearPrincipal = yearPayment - yearInterest;
      balance -= yearPrincipal;

      data.push({
        year,
        principal: yearPrincipal,
        interest: yearInterest,
        balance: Math.max(0, balance)
      });
    }

    setAmortizationData(data);
  };

  // Calculate affordability
  const calculateAffordability = () => {
    const monthlyIncome = parseFloat(annualIncome) / 12;
    const maxHousingPayment = monthlyIncome * 0.28; // 28% rule

    const rate = parseFloat(interestRate) / 100 / 12;
    const term = parseInt(loanTerm) * 12;

    if (rate > 0 && term > 0) {
      const maxLoan = maxHousingPayment * (Math.pow(1 + rate, term) - 1) / (rate * Math.pow(1 + rate, term));
      const downPaymentPercent = parseFloat(downPayment) / parseFloat(homePrice);
      const maxPrice = maxLoan / (1 - downPaymentPercent);

      setMaxAffordablePrice(maxPrice);
    }
  };

  useEffect(() => {
    calculateMortgage();
    calculateAffordability();
  }, [homePrice, downPayment, interestRate, loanTerm, propertyTax, homeInsurance, annualIncome, monthlyDebts]);

  const formatCurrency = (amount: number) => {
    return formatCurrencyINR(amount);
  };

  const renderPaymentBreakdown = () => {
    const principal = parseFloat(homePrice) - parseFloat(downPayment);
    const monthlyPrincipal = principal / (parseInt(loanTerm) * 12);
    const monthlyInterest = monthlyPayment - monthlyPrincipal - (parseFloat(homePrice) * parseFloat(propertyTax) / 100) / 12 - (parseFloat(homePrice) * parseFloat(homeInsurance) / 100) / 12;
    const monthlyTax = (parseFloat(homePrice) * parseFloat(propertyTax) / 100) / 12;
    const monthlyInsurance = (parseFloat(homePrice) * parseFloat(homeInsurance) / 100) / 12;

    const pieData = [
      {
        name: 'Principal',
        population: monthlyPrincipal,
        color: '#0061FF',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      },
      {
        name: 'Interest',
        population: monthlyInterest,
        color: '#FF6B6B',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      },
      {
        name: 'Tax',
        population: monthlyTax,
        color: '#4ECDC4',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      },
      {
        name: 'Insurance',
        population: monthlyInsurance,
        color: '#45B7D1',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      },
    ];

    return (
      <View className="mt-6">
        <Text className="text-lg font-rubik-bold text-black-300 mb-4">Payment Breakdown</Text>
        <View className="bg-white rounded-xl p-4 shadow-sm">
          <PieChart
            data={pieData}
            width={width - 80}
            height={200}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>
      </View>
    );
  };

  const renderAmortizationChart = () => {
    if (amortizationData.length === 0) return null;

    const chartData = {
      labels: amortizationData.slice(0, 10).map(d => `Y${d.year}`),
      datasets: [
        {
          data: amortizationData.slice(0, 10).map(d => d.principal),
          color: (opacity = 1) => `rgba(0, 97, 255, ${opacity})`,
          strokeWidth: 2,
        },
        {
          data: amortizationData.slice(0, 10).map(d => d.interest),
          color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };

    return (
      <View className="mt-6">
        <Text className="text-lg font-rubik-bold text-black-300 mb-4">Amortization Schedule</Text>
        <View className="bg-white rounded-xl p-4 shadow-sm">
          <LineChart
            data={chartData}
            width={width - 80}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: '#0061FF',
              },
            }}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16,
            }}
          />
          <View className="flex-row justify-center mt-2">
            <View className="flex-row items-center mr-4">
              <View style={{ width: 12, height: 12, backgroundColor: palette.secondary, borderRadius: 6, marginRight: 4 }} />
              <Text style={{ fontSize: 12, color: palette.textMuted }}>Principal</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-3 h-3 bg-red-400 rounded-full mr-1" />
              <Text style={{ fontSize: 12, color: palette.textMuted }}>Interest</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderCalculatorTab = () => (
    <ScrollView className="flex-1 p-4">
      <View className="space-y-6">
        {/* Input Fields */}
        <View className="space-y-4">
          <View>
            <Text style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>Home Price</Text>
            <TextInput
              value={homePrice}
              onChangeText={setHomePrice}
              keyboardType="numeric"
              placeholder="400,000"
              style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 12, fontSize: 16, color: palette.textPrimary, backgroundColor: palette.surfaceMuted }}
              placeholderTextColor={palette.textMuted}
            />
          </View>

          <View>
            <Text style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>Down Payment</Text>
            <TextInput
              value={downPayment}
              onChangeText={setDownPayment}
              keyboardType="numeric"
              placeholder="80,000"
              style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 12, fontSize: 16, color: palette.textPrimary, backgroundColor: palette.surfaceMuted }}
              placeholderTextColor={palette.textMuted}
            />
          </View>

          <View className="flex-row space-x-3">
            <View className="flex-1">
              <Text style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>Interest Rate (%)</Text>
              <TextInput
                value={interestRate}
                onChangeText={setInterestRate}
                keyboardType="numeric"
                placeholder="6.5"
                style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 12, fontSize: 16, color: palette.textPrimary, backgroundColor: palette.surfaceMuted }}
                placeholderTextColor={palette.textMuted}
              />
            </View>
            <View className="flex-1">
              <Text style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>Loan Term (Years)</Text>
              <TextInput
                value={loanTerm}
                onChangeText={setLoanTerm}
                keyboardType="numeric"
                placeholder="30"
                style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 12, fontSize: 16, color: palette.textPrimary, backgroundColor: palette.surfaceMuted }}
                placeholderTextColor={palette.textMuted}
              />
            </View>
          </View>

          <View className="flex-row space-x-3">
            <View className="flex-1">
              <Text style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>Property Tax (%)</Text>
              <TextInput
                value={propertyTax}
                onChangeText={setPropertyTax}
                keyboardType="numeric"
                placeholder="1.2"
                style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 12, fontSize: 16, color: palette.textPrimary, backgroundColor: palette.surfaceMuted }}
                placeholderTextColor={palette.textMuted}
              />
            </View>
            <View className="flex-1">
              <Text style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>Insurance (%)</Text>
              <TextInput
                value={homeInsurance}
                onChangeText={setHomeInsurance}
                keyboardType="numeric"
                placeholder="0.5"
                style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 12, fontSize: 16, color: palette.textPrimary, backgroundColor: palette.surfaceMuted }}
                placeholderTextColor={palette.textMuted}
              />
            </View>
          </View>
        </View>

        {/* Results Card */}
        <View style={{
          backgroundColor: palette.surfaceElevated,
          borderRadius: 16,
          padding: 24,
          borderWidth: 1,
          borderColor: palette.border,
          shadowColor: palette.shadow,
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        }}>
          <Text style={{ color: palette.textPrimary, fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Monthly Payment</Text>
          <Text style={{ color: palette.primary, fontSize: 32, fontWeight: 'bold', marginBottom: 16 }}>{formatCurrency(monthlyPayment)}</Text>

          <View className="space-y-2">
            <View className="flex-row justify-between">
              <Text style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Principal & Interest</Text>
              <Text style={{ fontWeight: '500', color: palette.textPrimary }}>{formatCurrency(monthlyPayment - (parseFloat(homePrice) * parseFloat(propertyTax) / 100) / 12 - (parseFloat(homePrice) * parseFloat(homeInsurance) / 100) / 12)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: palette.textSecondary }}>Property Tax</Text>
              <Text style={{ fontWeight: '500', color: palette.textPrimary }}>{formatCurrency((parseFloat(homePrice) * parseFloat(propertyTax) / 100) / 12)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: palette.textSecondary }}>Insurance</Text>
              <Text style={{ fontWeight: '500', color: palette.textPrimary }}>{formatCurrency((parseFloat(homePrice) * parseFloat(homeInsurance) / 100) / 12)}</Text>
            </View>
          </View>
        </View>

        {/* Total Cost Summary */}
        <View style={{ backgroundColor: palette.surfaceMuted, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: palette.border }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: palette.textPrimary, marginBottom: 16 }}>Total Cost Summary</Text>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: palette.textSecondary }}>Total Interest Paid</Text>
              <Text style={{ fontWeight: 'bold', color: palette.danger }}>{formatCurrency(totalInterest)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: palette.textSecondary }}>Total Cost</Text>
              <Text style={{ fontWeight: 'bold', color: palette.textPrimary }}>{formatCurrency(totalCost)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: palette.textSecondary }}>Loan Amount</Text>
              <Text style={{ fontWeight: 'bold', color: palette.secondary }}>{formatCurrency(parseFloat(homePrice) - parseFloat(downPayment))}</Text>
            </View>
          </View>
        </View>

        {/* Charts */}
        {renderPaymentBreakdown()}
        {renderAmortizationChart()}
      </View>
    </ScrollView>
  );

  const renderAffordabilityTab = () => (
    <ScrollView className="flex-1 p-4">
      <View className="space-y-6">
        <View>
          <Text className="text-base font-rubik-medium text-black-300 mb-2">Annual Income</Text>
          <TextInput
            value={annualIncome}
            onChangeText={setAnnualIncome}
            keyboardType="numeric"
            placeholder="80,000"
            style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 12, fontSize: 16, color: palette.textPrimary, backgroundColor: palette.surfaceMuted }}
            placeholderTextColor={palette.textMuted}
          />
        </View>

        <View>
          <Text className="text-base font-rubik-medium text-black-300 mb-2">Monthly Debts</Text>
          <TextInput
            value={monthlyDebts}
            onChangeText={setMonthlyDebts}
            keyboardType="numeric"
            placeholder="500"
            style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 12, fontSize: 16, color: palette.textPrimary, backgroundColor: palette.surfaceMuted }}
            placeholderTextColor={palette.textMuted}
          />
        </View>

        {/* Affordability Results */}
        <View style={{
          backgroundColor: palette.surfaceElevated,
          borderRadius: 16,
          padding: 24,
          borderWidth: 1,
          borderColor: palette.border,
          shadowColor: palette.shadow,
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        }}>
          <Text style={{ color: palette.textPrimary, fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Maximum Affordable Price</Text>
          <Text style={{ color: palette.primary, fontSize: 32, fontWeight: 'bold', marginBottom: 16 }}>{formatCurrency(maxAffordablePrice)}</Text>

          <View className="space-y-2">
            <View className="flex-row justify-between">
              <Text style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Monthly Income</Text>
              <Text style={{ fontWeight: '500', color: palette.textPrimary }}>{formatCurrency(parseFloat(annualIncome) / 12)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: palette.textSecondary }}>Max Housing Payment (28%)</Text>
              <Text style={{ fontWeight: '500', color: palette.textPrimary }}>{formatCurrency((parseFloat(annualIncome) / 12) * 0.28)}</Text>
            </View>
          </View>
        </View>

        {/* Affordability Guidelines */}
        <View style={{ backgroundColor: palette.surfaceMuted, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: palette.border }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: palette.textPrimary, marginBottom: 16 }}>Affordability Guidelines</Text>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 12, height: 12, backgroundColor: palette.primary, borderRadius: 6, marginRight: 12 }} />
              <Text style={{ color: palette.textSecondary, flex: 1 }}>28% rule: Housing costs should not exceed 28% of gross income</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 12, height: 12, backgroundColor: '#F1C40F', borderRadius: 6, marginRight: 12 }} />
              <Text style={{ color: palette.textSecondary, flex: 1 }}>36% rule: Total debt should not exceed 36% of gross income</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 12, height: 12, backgroundColor: palette.secondary, borderRadius: 6, marginRight: 12 }} />
              <Text style={{ color: palette.textSecondary, flex: 1 }}>20% down payment recommended to avoid PMI</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: palette.surface, borderBottomWidth: 1, borderBottomColor: palette.border }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: palette.textPrimary }}>Mortgage Calculator</Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <Text style={{ fontSize: 24, color: palette.textMuted }}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', backgroundColor: palette.surface, borderBottomWidth: 1, borderBottomColor: palette.border }}>
          <TouchableOpacity
            onPress={() => setActiveTab('calculator')}
            style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: activeTab === 'calculator' ? 2 : 0, borderBottomColor: palette.primary }}
          >
            <Text style={{ textAlign: 'center', fontWeight: '500', color: activeTab === 'calculator' ? palette.primary : palette.textMuted }}>
              Calculator
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('affordability')}
            style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: activeTab === 'affordability' ? 2 : 0, borderBottomColor: palette.primary }}
          >
            <Text style={{ textAlign: 'center', fontWeight: '500', color: activeTab === 'affordability' ? palette.primary : palette.textMuted }}>
              Affordability
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'calculator' && renderCalculatorTab()}
        {activeTab === 'affordability' && renderAffordabilityTab()}
      </SafeAreaView>
    </Modal>
  );
};

export default MortgageCalculator; 