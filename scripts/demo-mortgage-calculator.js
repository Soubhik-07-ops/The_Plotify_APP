console.log('💰 Mortgage Calculator Feature Demo');
console.log('===================================\n');

// Demo scenarios
const demoScenarios = [
    {
        name: 'First-Time Homebuyer',
        homePrice: 350000,
        downPayment: 70000, // 20%
        interestRate: 6.5,
        loanTerm: 30,
        annualIncome: 75000,
        monthlyDebts: 400
    },
    {
        name: 'FHA Loan Buyer',
        homePrice: 280000,
        downPayment: 9800, // 3.5%
        interestRate: 6.8,
        loanTerm: 30,
        annualIncome: 65000,
        monthlyDebts: 300
    },
    {
        name: 'VA Loan Veteran',
        homePrice: 450000,
        downPayment: 0, // 0% down
        interestRate: 6.2,
        loanTerm: 30,
        annualIncome: 85000,
        monthlyDebts: 200
    },
    {
        name: 'Investment Property',
        homePrice: 500000,
        downPayment: 125000, // 25%
        interestRate: 7.2,
        loanTerm: 30,
        annualIncome: 120000,
        monthlyDebts: 800
    }
];

// Mortgage calculation function
function calculateMortgage(homePrice, downPayment, interestRate, loanTerm, propertyTax = 1.2, homeInsurance = 0.5) {
    const principal = homePrice - downPayment;
    const rate = interestRate / 100 / 12;
    const term = loanTerm * 12;

    if (principal <= 0 || rate <= 0 || term <= 0) return null;

    const monthlyPayment = principal * (rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1);
    const monthlyTax = (homePrice * propertyTax / 100) / 12;
    const monthlyInsurance = (homePrice * homeInsurance / 100) / 12;

    const totalMonthlyPayment = monthlyPayment + monthlyTax + monthlyInsurance;
    const totalPayment = totalMonthlyPayment * term;
    const totalInterest = (monthlyPayment * term) - principal;

    return {
        monthlyPayment: totalMonthlyPayment,
        principalAndInterest: monthlyPayment,
        propertyTax: monthlyTax,
        homeInsurance: monthlyInsurance,
        totalPayment,
        totalInterest,
        downPaymentPercent: (downPayment / homePrice) * 100
    };
}

// Affordability calculation
function calculateAffordability(annualIncome, monthlyDebts, interestRate, loanTerm, downPaymentPercent) {
    const monthlyIncome = annualIncome / 12;
    const maxHousingPayment = monthlyIncome * 0.28; // 28% rule

    const rate = interestRate / 100 / 12;
    const term = loanTerm * 12;

    if (rate > 0 && term > 0) {
        const maxLoan = maxHousingPayment * (Math.pow(1 + rate, term) - 1) / (rate * Math.pow(1 + rate, term));
        const maxPrice = maxLoan / (1 - downPaymentPercent / 100);

        return {
            maxAffordablePrice: maxPrice,
            maxMonthlyPayment: maxHousingPayment,
            debtToIncomeRatio: ((monthlyDebts + maxHousingPayment) / monthlyIncome) * 100
        };
    }

    return null;
}

// Loan type information
const loanTypes = {
    conventional: {
        name: 'Conventional',
        minDownPayment: 20,
        maxLoanAmount: 647200,
        pmiRequired: false,
        benefits: ['No PMI with 20% down', 'Lower interest rates', 'Flexible terms']
    },
    fha: {
        name: 'FHA',
        minDownPayment: 3.5,
        maxLoanAmount: 472030,
        pmiRequired: true,
        benefits: ['Low down payment', 'Easier credit requirements', 'Government backed']
    },
    va: {
        name: 'VA',
        minDownPayment: 0,
        maxLoanAmount: 647200,
        pmiRequired: false,
        benefits: ['No down payment required', 'No PMI', 'Lower interest rates']
    },
    usda: {
        name: 'USDA',
        minDownPayment: 0,
        maxLoanAmount: 647200,
        pmiRequired: true,
        benefits: ['No down payment', 'Low interest rates', 'Rural property focus']
    }
};

// Down payment assistance programs
const assistancePrograms = [
    {
        name: 'FHA Down Payment Grant',
        amount: 10000,
        description: 'Federal grant for first-time homebuyers',
        eligibility: ['First-time homebuyer', 'Income below 80% AMI', 'FHA loan']
    },
    {
        name: 'State Housing Grant',
        amount: 15000,
        description: 'State-specific down payment assistance',
        eligibility: ['State resident', 'Income below 120% AMI', 'First-time buyer']
    },
    {
        name: 'Local Homebuyer Program',
        amount: 8000,
        description: 'City/county down payment assistance',
        eligibility: ['Local resident', 'Income below 100% AMI']
    }
];

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

// Format percentage
function formatPercent(value) {
    return `${value.toFixed(1)}%`;
}

// Demo function
function demonstrateMortgageCalculator() {
    console.log('🔢 Mortgage Calculation Examples\n');

    demoScenarios.forEach((scenario, index) => {
        console.log(`${index + 1}. ${scenario.name}`);
        console.log('   ──────────────────────────────────');

        const mortgage = calculateMortgage(
            scenario.homePrice,
            scenario.downPayment,
            scenario.interestRate,
            scenario.loanTerm
        );

        const affordability = calculateAffordability(
            scenario.annualIncome,
            scenario.monthlyDebts,
            scenario.interestRate,
            scenario.loanTerm,
            mortgage.downPaymentPercent
        );

        console.log(`   Home Price: ${formatCurrency(scenario.homePrice)}`);
        console.log(`   Down Payment: ${formatCurrency(scenario.downPayment)} (${formatPercent(mortgage.downPaymentPercent)})`);
        console.log(`   Interest Rate: ${scenario.interestRate}%`);
        console.log(`   Loan Term: ${scenario.loanTerm} years`);
        console.log(`   Annual Income: ${formatCurrency(scenario.annualIncome)}`);
        console.log(`   Monthly Debts: ${formatCurrency(scenario.monthlyDebts)}`);
        console.log('');

        console.log('   📊 Monthly Payment Breakdown:');
        console.log(`      Principal & Interest: ${formatCurrency(mortgage.principalAndInterest)}`);
        console.log(`      Property Tax: ${formatCurrency(mortgage.propertyTax)}`);
        console.log(`      Home Insurance: ${formatCurrency(mortgage.homeInsurance)}`);
        console.log(`      Total Monthly Payment: ${formatCurrency(mortgage.monthlyPayment)}`);
        console.log('');

        console.log('   💰 Total Costs:');
        console.log(`      Total Payment (${scenario.loanTerm} years): ${formatCurrency(mortgage.totalPayment)}`);
        console.log(`      Total Interest: ${formatCurrency(mortgage.totalInterest)}`);
        console.log(`      Down Payment: ${formatCurrency(scenario.downPayment)}`);
        console.log('');

        console.log('   📈 Affordability Analysis:');
        console.log(`      Max Affordable Price: ${formatCurrency(affordability.maxAffordablePrice)}`);
        console.log(`      Max Monthly Payment: ${formatCurrency(affordability.maxMonthlyPayment)}`);
        console.log(`      Debt-to-Income Ratio: ${formatPercent(affordability.debtToIncomeRatio)}`);

        const isAffordable = scenario.homePrice <= affordability.maxAffordablePrice;
        console.log(`      Status: ${isAffordable ? '✅ Affordable' : '❌ Not Affordable'}`);
        console.log('');
    });
}

// Demo loan types
function demonstrateLoanTypes() {
    console.log('🏦 Loan Types Comparison\n');

    Object.entries(loanTypes).forEach(([key, loan]) => {
        console.log(`${loan.name} Loan:`);
        console.log(`   Min Down Payment: ${loan.minDownPayment}%`);
        console.log(`   Max Loan Amount: ${formatCurrency(loan.maxLoanAmount)}`);
        console.log(`   PMI Required: ${loan.pmiRequired ? 'Yes' : 'No'}`);
        console.log('   Benefits:');
        loan.benefits.forEach(benefit => {
            console.log(`      • ${benefit}`);
        });
        console.log('');
    });
}

// Demo down payment assistance
function demonstrateAssistance() {
    console.log('🤝 Down Payment Assistance Programs\n');

    assistancePrograms.forEach((program, index) => {
        console.log(`${index + 1}. ${program.name}`);
        console.log(`   Amount: ${formatCurrency(program.amount)}`);
        console.log(`   Description: ${program.description}`);
        console.log('   Eligibility:');
        program.eligibility.forEach(requirement => {
            console.log(`      • ${requirement}`);
        });
        console.log('');
    });
}

// Demo affordability guidelines
function demonstrateAffordabilityGuidelines() {
    console.log('📋 Affordability Guidelines\n');

    const guidelines = [
        {
            rule: '28% Rule (Front-end Ratio)',
            description: 'Housing costs should not exceed 28% of gross monthly income',
            calculation: 'Monthly housing payment ÷ Gross monthly income ≤ 28%'
        },
        {
            rule: '36% Rule (Back-end Ratio)',
            description: 'Total debt payments should not exceed 36% of gross monthly income',
            calculation: '(Monthly housing payment + Other debts) ÷ Gross monthly income ≤ 36%'
        },
        {
            rule: '20% Down Payment',
            description: 'Recommended to avoid PMI and get better rates',
            calculation: 'Down payment ÷ Home price ≥ 20%'
        }
    ];

    guidelines.forEach((guideline, index) => {
        console.log(`${index + 1}. ${guideline.rule}`);
        console.log(`   ${guideline.description}`);
        console.log(`   Formula: ${guideline.calculation}`);
        console.log('');
    });
}

// Run demonstrations
console.log('🚀 Running Mortgage Calculator Demonstrations\n');

demonstrateMortgageCalculator();
demonstrateLoanTypes();
demonstrateAssistance();
demonstrateAffordabilityGuidelines();

console.log('✅ Demo completed!');
console.log('\n📱 To test the mortgage calculator in the app:');
console.log('1. Open the app and go to the home page');
console.log('2. Click the "💰 Calculator" button in the quick actions');
console.log('3. Or view a property and click "Calculate Mortgage"');
console.log('4. Try different scenarios in the three tabs:');
console.log('   • Calculator: Basic mortgage calculations');
console.log('   • Affordability: See what you can afford');
console.log('   • Assistance: Down payment help programs');
console.log('\n💡 Features included:');
console.log('• Real-time calculations as you type');
console.log('• Multiple loan types (Conventional, FHA, VA, USDA)');
console.log('• Affordability analysis with 28%/36% rules');
console.log('• Down payment assistance program finder');
console.log('• Property tax and insurance estimates');
console.log('• PMI calculations for low down payments'); 