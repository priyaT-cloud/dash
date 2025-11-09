
import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- TYPE DEFINITION ---
interface Transaction {
    id: number;
    date: string;
    description: string;
    category: string;
    amount: number;
    type: 'income' | 'expense';
}

// --- MOCK DATA (as a fallback) ---
const mockTransactions: Transaction[] = [
    { id: 1, date: '2024-07-15', description: 'Starbucks Coffee', category: 'Food & Drink', amount: -5.75, type: 'expense' },
    { id: 2, date: '2024-07-16', description: 'Paycheck Deposit', category: 'Income', amount: 2500.00, type: 'income' },
    { id: 3, date: '2024-07-17', description: 'Netflix Subscription', category: 'Entertainment', amount: -15.49, type: 'expense' },
    { id: 4, date: '2024-07-18', description: 'Grocery Shopping', category: 'Groceries', amount: -85.30, type: 'expense' },
    { id: 5, date: '2024-07-19', description: 'Gasoline', category: 'Transport', amount: -45.00, type: 'expense' },
    { id: 6, date: '2024-07-22', description: 'Client Payment', category: 'Income', amount: 750.00, type: 'income' },
];

// --- STYLES ---
const styles: { [key: string]: React.CSSProperties } = {
    dashboard: { display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1200px', margin: 'auto' },
    header: { color: 'var(--text-primary)', fontSize: '2rem', fontWeight: 'bold' },
    mainGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' },
    card: { backgroundColor: 'var(--surface)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border)' },
    cardTitle: { margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-secondary)' },
    overviewContainer: { display: 'flex', justifyContent: 'space-around', gap: '1rem' },
    overviewItem: { textAlign: 'center' },
    overviewLabel: { color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem' },
    overviewValue: { fontSize: '1.75rem', fontWeight: 'bold' },
    transactionsList: { listStyle: 'none', padding: '0', margin: '0', maxHeight: '300px', overflowY: 'auto' },
    transactionItem: { display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0.5rem', borderBottom: '1px solid var(--border)' },
    transactionDesc: { fontWeight: '500' },
    transactionCat: { fontSize: '0.8rem', color: 'var(--text-secondary)' },
    transactionAmount: { fontWeight: '600' },
    aiForm: { display: 'flex', gap: '0.5rem', marginTop: '1rem' },
    aiInput: { flexGrow: 1, padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--background)', color: 'var(--text-primary)', fontSize: '1rem' },
    aiButton: { padding: '0.75rem 1.5rem', border: 'none', borderRadius: '8px', backgroundColor: 'var(--primary)', color: 'white', fontWeight: '600', cursor: 'pointer' },
    aiResponse: { marginTop: '1rem', backgroundColor: 'var(--background)', padding: '1rem', borderRadius: '8px', whiteSpace: 'pre-wrap', lineHeight: '1.6' },
    chartContainer: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    chartBarWrapper: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
    chartLabel: { flexBasis: '100px', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    chartBar: { height: '20px', borderRadius: '4px' },
    homeContainer: { textAlign: 'center', maxWidth: '700px', margin: '2rem auto' },
    form: { display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' },
    inputGroup: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
    input: { width: '100%', boxSizing: 'border-box', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--background)', color: 'var(--text-primary)', fontSize: '1rem', fontFamily: "'Inter', sans-serif" },
    select: { width: '100%', boxSizing: 'border-box', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--background)', color: 'var(--text-primary)', fontSize: '1rem', fontFamily: "'Inter', sans-serif" },
    fullWidth: { gridColumn: '1 / -1' },
    button: { padding: '0.75rem 1.5rem', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '600', cursor: 'pointer' },
    removeButton: { backgroundColor: 'transparent', color: 'var(--danger)', border: 'none', cursor: 'pointer', padding: '0 0 0 1rem' },
    dropZone: { border: '2px dashed var(--border)', borderRadius: '12px', padding: '2rem', marginBottom: '2rem', cursor: 'pointer', transition: 'background-color 0.2s, border-color 0.2s' },
    dropZoneActive: { backgroundColor: 'rgba(74, 144, 226, 0.1)', borderColor: 'var(--primary)' },
    orSeparator: { display: 'flex', alignItems: 'center', textAlign: 'center', color: 'var(--text-secondary)', margin: '2rem 0' },
    orSeparatorLine: { flexGrow: 1, height: '1px', backgroundColor: 'var(--border)' },
    orSeparatorText: { padding: '0 1rem' },
    svgChart: { width: '100%', height: '250px' },
    textArea: {
        width: '100%',
        boxSizing: 'border-box',
        padding: '0.75rem',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        backgroundColor: 'var(--background)',
        color: 'var(--text-primary)',
        fontSize: '0.9rem',
        height: '150px',
        resize: 'vertical',
        fontFamily: "'Inter', sans-serif"
    },
};

// --- HELPER FUNCTIONS ---
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const parseCSV = (csvText: string): Array<Record<string, string>> => {
    try {
        const rows = csvText.trim().split('\n').filter(row => row.trim() !== '');
        if (rows.length < 2) {
             throw new Error("CSV must contain a header row and at least one data row.");
        }

        const headerRow = rows.shift() as string;
        
        // Remove BOM if present
        const cleanHeaderRow = headerRow.charCodeAt(0) === 0xFEFF ? headerRow.substring(1) : headerRow;
        const headers = cleanHeaderRow.split(',').map(h => h.trim().replace(/^"|"$/g, ''));

        return rows.map(row => {
            // A simple split can fail with quoted commas, but it's a trade-off for simplicity.
            const values = row.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const entry: Record<string, string> = {};
            headers.forEach((header, index) => {
                entry[header] = values[index] || '';
            });
            return entry;
        });
    } catch (error) {
        console.error("CSV Parsing Error:", error);
        alert(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return [];
    }
};

// --- COMPONENTS ---

const Overview = ({ transactions }: { transactions: Transaction[] }) => {
    const { totalIncome, totalExpenses, balance } = useMemo(() => {
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const balance = totalIncome - totalExpenses;
        return { totalIncome, totalExpenses, balance };
    }, [transactions]);

    return (
        <div style={{...styles.card, ...styles.overviewContainer}}>
            <div style={styles.overviewItem}>
                <div style={styles.overviewLabel}>Total Balance</div>
                <div style={{...styles.overviewValue, color: balance >= 0 ? 'var(--success)' : 'var(--danger)'}}>{formatCurrency(balance)}</div>
            </div>
            <div style={styles.overviewItem}>
                <div style={styles.overviewLabel}>Income</div>
                <div style={{...styles.overviewValue, color: 'var(--success)'}}>{formatCurrency(totalIncome)}</div>
            </div>
             <div style={styles.overviewItem}>
                <div style={styles.overviewLabel}>Expenses</div>
                <div style={{...styles.overviewValue, color: 'var(--danger)'}}>{formatCurrency(totalExpenses)}</div>
            </div>
        </div>
    );
};

const SpendingChart = ({ transactions }: { transactions: Transaction[] }) => {
    const spendingByCategory = useMemo(() => {
        const expenses = transactions.filter(t => t.type === 'expense');
        if (expenses.length === 0) return [];
        const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const categories = expenses.reduce((acc: { [key: string]: number }, t) => {
            acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
            return acc;
        }, {});
        return Object.entries(categories).map(([name, amount]) => ({
            name,
            amount,
            percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        })).sort((a, b) => b.amount - a.amount);
    }, [transactions]);
    
    const colors = ['#4a90e2', '#50e3c2', '#f5a623', '#bd10e0', '#d0021b'];

    return (
        <div style={styles.card}>
            <h2 style={styles.cardTitle}>Spending by Category</h2>
            <div style={styles.chartContainer}>
                {spendingByCategory.length > 0 ? spendingByCategory.map((cat, index) => (
                    <div key={cat.name} style={styles.chartBarWrapper}>
                        <div style={styles.chartLabel} title={cat.name}>{cat.name}</div>
                        <div style={{...styles.chartBar, width: `${cat.percentage}%`, backgroundColor: colors[index % colors.length]}}></div>
                    </div>
                )) : <p style={{color: 'var(--text-secondary)'}}>No expense data to display.</p>}
            </div>
        </div>
    );
};

const BalanceTrendChart = ({ transactions }: { transactions: Transaction[] }) => {
    const chartData = useMemo(() => {
        if (transactions.length < 2) return null;

        const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const balancePoints: { date: Date; balance: number }[] = [];
        let runningBalance = 0;

        sorted.forEach(t => {
            runningBalance += t.amount;
            balancePoints.push({ date: new Date(t.date), balance: runningBalance });
        });
        
        const dates = balancePoints.map(p => p.date);
        const balances = balancePoints.map(p => p.balance);
        const minBalance = Math.min(...balances);
        const maxBalance = Math.max(...balances);
        const minDate = Math.min(...dates.map(d => d.getTime()));
        const maxDate = Math.max(...dates.map(d => d.getTime()));

        const balanceRange = maxBalance - minBalance;
        const dateRange = maxDate - minDate;

        if (balanceRange === 0 || dateRange === 0) return null;

        const points = balancePoints.map(p => {
            const x = ((p.date.getTime() - minDate) / dateRange) * 100;
            const y = 100 - (((p.balance - minBalance) / balanceRange) * 100);
            return `${x},${y}`;
        }).join(' ');

        return { points, minBalance, maxBalance };
    }, [transactions]);

    return (
        <div style={styles.card}>
            <h2 style={styles.cardTitle}>Balance Trend</h2>
            {chartData ? (
                 <svg viewBox="0 0 100 100" style={styles.svgChart} preserveAspectRatio="none">
                    <polyline
                        fill="none"
                        stroke="var(--primary)"
                        strokeWidth="2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        points={chartData.points}
                    />
                </svg>
            ) : (
                <p style={{color: 'var(--text-secondary)'}}>Not enough data for a trend line.</p>
            )}
        </div>
    );
};


const RecentTransactions = ({ transactions }: { transactions: Transaction[] }) => (
    <div style={styles.card}>
        <h2 style={styles.cardTitle}>Recent Transactions</h2>
        <ul style={styles.transactionsList}>
            {transactions.length > 0 ? [...transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10).map(t => (
                <li key={t.id} style={styles.transactionItem}>
                    <div>
                        <div style={styles.transactionDesc}>{t.description}</div>
                        <div style={styles.transactionCat}>{t.category}</div>
                    </div>
                    <div style={{...styles.transactionAmount, color: t.type === 'income' ? 'var(--success)' : 'var(--text-primary)'}}>
                        {t.type === 'expense' ? '-' : ''}{formatCurrency(Math.abs(t.amount))}
                    </div>
                </li>
            )) : <p style={{color: 'var(--text-secondary)'}}>No transactions yet.</p>}
        </ul>
    </div>
);

const AIFinancialAdvisor = ({ transactions }: { transactions: Transaction[] }) => {
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const getInsights = async () => {
        if (!query || transactions.length === 0) return;
        setLoading(true);
        setError('');
        setResponse('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const transactionsSummary = JSON.stringify(transactions.slice(0, 50), null, 2); // Limit summary size
            const prompt = `
                You are an expert financial advisor. Based on the following JSON transaction data, answer the user's question.
                Provide a short, accurate, and actionable response. Avoid lengthy sentences and keep the advice direct and to the point.

                Transaction Data:
                ${transactionsSummary}

                User's Question:
                "${query}"
            `;

            const result = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
            });

            setResponse(result.text);
        } catch (e) {
            console.error(e);
            setError('Failed to get insights. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{...styles.card, gridColumn: '1 / -1'}}>
            <h2 style={styles.cardTitle}>AI Financial Advisor</h2>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)'}}>Ask anything about your finances. e.g., "Where did I spend the most money?" or "Give me some saving tips based on my spending."</p>
            <form style={styles.aiForm} onSubmit={e => { e.preventDefault(); getInsights(); }}>
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Ask a question..."
                    style={styles.aiInput}
                    aria-label="Financial question"
                    disabled={loading || transactions.length === 0}
                />
                <button type="submit" style={{...styles.aiButton, opacity: (loading || transactions.length === 0) ? 0.6 : 1}} disabled={loading || transactions.length === 0}>
                    {loading ? 'Analyzing...' : 'Get Insights'}
                </button>
            </form>
            {error && <p style={{color: 'var(--danger)'}}>{error}</p>}
            {response && <div style={styles.aiResponse} aria-live="polite">{response}</div>}
        </div>
    );
}

const HomePage = ({ onDashboardReady, isLoading }: { onDashboardReady: (manual: Transaction[], raw: Array<Record<string, string>> | null) => void, isLoading: boolean }) => {
    const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);
    const [rawCsvData, setRawCsvData] = useState<Array<Record<string, string>> | null>(null);
    const [uploadInfo, setUploadInfo] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Food & Drink');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [isDragging, setIsDragging] = useState(false);
    const [pastedData, setPastedData] = useState('');

    const handleAddTransaction = (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseFloat(amount);
        if (!description || !category || isNaN(numericAmount) || numericAmount <= 0) {
            alert("Please fill all fields with valid data.");
            return;
        }
        const newTransaction: Transaction = {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            description,
            category,
            amount: type === 'expense' ? -numericAmount : numericAmount,
            type,
        };
        setUserTransactions(prev => [newTransaction, ...prev]);
        setDescription('');
        setAmount('');
    };
    
    const handleRemoveTransaction = (id: number) => {
        setUserTransactions(userTransactions.filter(t => t.id !== id));
    };
    
    const handleDragEvents = (e: React.DragEvent, action: 'enter' | 'leave' | 'over') => {
        e.preventDefault();
        e.stopPropagation();
        if (action === 'enter' || action === 'over') {
            setIsDragging(true);
        } else if (action === 'leave') {
            setIsDragging(false);
        }
    };
    
    const handleDrop = (e: React.DragEvent) => {
        handleDragEvents(e, 'leave');
        const file = e.dataTransfer.files?.[0];
        if (file && file.type === 'text/csv') {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                const parsed = parseCSV(text);
                if (parsed.length > 0) {
                    setRawCsvData(parsed);
                    setUploadInfo(`${parsed.length} rows loaded from ${file.name}.`);
                }
            };
            reader.readAsText(file);
        } else {
            alert('Please drop a valid .csv file.');
        }
    };

    const handleProcessPastedData = (e: React.FormEvent) => {
        e.preventDefault();
        if (!pastedData.trim()) {
            alert("Please paste some data first.");
            return;
        }
        const parsed = parseCSV(pastedData);
        if (parsed.length > 0) {
            setRawCsvData(parsed);
            setUploadInfo(`${parsed.length} rows loaded from pasted data.`);
            setPastedData('');
        }
    };

    const categories = ['Food & Drink', 'Groceries', 'Transport', 'Entertainment', 'Shopping', 'Housing', 'Utilities', 'Income'];

    return (
        <div style={styles.homeContainer}>
            <h1 style={styles.header}>Welcome</h1>
            <p style={{color: 'var(--text-secondary)', marginBottom: '2rem'}}>Upload a CSV, paste data, or add transactions manually to generate your dashboard.</p>
            
            <div 
                style={{...styles.dropZone, ...(isDragging ? styles.dropZoneActive : {})}}
                onDragEnter={(e) => handleDragEvents(e, 'enter')}
                onDragOver={(e) => handleDragEvents(e, 'over')}
                onDragLeave={(e) => handleDragEvents(e, 'leave')}
                onDrop={handleDrop}
            >
                <p><strong>Drag & Drop your CSV file here</strong></p>
                <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Our AI will analyze your columns (e.g., date, amount).</p>
                {uploadInfo && !pastedData && <p style={{color: 'var(--success)'}}>{uploadInfo}</p>}
            </div>

            <div style={styles.orSeparator}>
                <div style={styles.orSeparatorLine}></div>
                <span style={styles.orSeparatorText}>OR</span>
                <div style={styles.orSeparatorLine}></div>
            </div>

            <div style={styles.card}>
                <h2 style={styles.cardTitle}>Paste Transaction Data</h2>
                <form style={styles.form} onSubmit={handleProcessPastedData}>
                     <p style={{color: 'var(--text-secondary)', margin: '-0.5rem 0 0.5rem 0', fontSize: '0.9rem'}}>Paste comma-separated data from a spreadsheet. The first row should be headers.</p>
                    <textarea
                        style={styles.textArea}
                        placeholder={"Date,Details,Amount\n2024-07-25,Groceries,-55.20"}
                        value={pastedData}
                        onChange={e => setPastedData(e.target.value)}
                        aria-label="Paste transaction data"
                    />
                     {uploadInfo && pastedData && <p style={{color: 'var(--success)'}}>{uploadInfo}</p>}
                    <button type="submit" style={{...styles.button, backgroundColor: 'var(--primary)'}}>Process Pasted Data</button>
                </form>
            </div>
            
            <div style={styles.orSeparator}>
                <div style={styles.orSeparatorLine}></div>
                <span style={styles.orSeparatorText}>OR</span>
                <div style={styles.orSeparatorLine}></div>
            </div>

            <div style={styles.card}>
                <h2 style={styles.cardTitle}>Add a Single Transaction</h2>
                <form style={styles.form} onSubmit={handleAddTransaction}>
                    <input type="text" placeholder="Description (e.g., 'Coffee')" value={description} onChange={e => setDescription(e.target.value)} style={{...styles.input, ...styles.fullWidth}} required />
                    <div style={styles.inputGroup}>
                        <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} style={styles.input} min="0.01" step="0.01" required />
                        <select value={type} onChange={e => setType(e.target.value as 'income' | 'expense')} style={styles.select}>
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                        </select>
                    </div>
                    <select value={category} onChange={e => setCategory(e.target.value)} style={{...styles.select, ...styles.fullWidth}}>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button type="submit" style={{...styles.button, backgroundColor: 'var(--primary)'}}>Add Transaction</button>
                </form>
            </div>
            
            {userTransactions.length > 0 && (
                 <div style={{...styles.card, marginTop: '2rem'}}>
                    <h2 style={styles.cardTitle}>Your Manual Entries</h2>
                    <ul style={{...styles.transactionsList, maxHeight: '200px'}}>
                        {userTransactions.map(t => (
                            <li key={t.id} style={styles.transactionItem}>
                                <div>
                                    <div style={styles.transactionDesc}>{t.description}</div>
                                    <div style={styles.transactionCat}>{t.category}</div>
                                </div>
                                <div style={{display: 'flex', alignItems: 'center'}}>
                                    <span style={{...styles.transactionAmount, color: t.type === 'income' ? 'var(--success)' : 'var(--text-primary)'}}>
                                        {formatCurrency(t.amount)}
                                    </span>
                                    <button onClick={() => handleRemoveTransaction(t.id)} style={styles.removeButton} aria-label={`Remove ${t.description}`}>&times;</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <button onClick={() => onDashboardReady(userTransactions, rawCsvData)} style={{...styles.button, backgroundColor: 'var(--success)', marginTop: '2rem', width: '100%', padding: '1rem', opacity: (userTransactions.length === 0 && !rawCsvData) || isLoading ? 0.6 : 1}} disabled={(userTransactions.length === 0 && !rawCsvData) || isLoading}>
                {isLoading ? 'AI is Analyzing...' : 'Generate Dashboard'}
            </button>
        </div>
    );
};

// --- APP ---
const App = () => {
    const [view, setView] = useState<'home' | 'dashboard'>('home');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleDashboardReady = async (manualTransactions: Transaction[], rawData: Array<Record<string, string>> | null) => {
        let allTransactions: Transaction[] = [...manualTransactions];

        if (rawData && rawData.length > 0) {
            setIsLoading(true);
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const prompt = `
                    You are an intelligent data processor for financial data. Your task is to analyze raw JSON data from a user's CSV and convert it into a standardized list of transactions. Intelligently identify columns for date, description, category, and amount, even with varied names.
                    
                    The target format is a JSON array of objects with these keys:
                    - "date": String in "YYYY-MM-DD" format.
                    - "description": String.
                    - "category": String. Use "Uncategorized" if not found.
                    - "amount": Number. Expenses must be negative, income positive.
                    
                    Rules:
                    1. Amount: Handle single columns or separate debit/credit columns. Convert debits to negative. Clean currency symbols.
                    2. Date: Find the date column and convert it to YYYY-MM-DD.
                    3. Description: Find the most likely description column.
                    
                    Return ONLY the standardized JSON array.

                    Raw Data (up to 100 rows):
                    ${JSON.stringify(rawData.slice(0, 100))}
                `;

                 const responseSchema = {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            date: { type: Type.STRING, description: "Transaction date in YYYY-MM-DD format." },
                            description: { type: Type.STRING, description: "Description of the transaction." },
                            category: { type: Type.STRING, description: "Category of the transaction." },
                            amount: { type: Type.NUMBER, description: "Transaction amount. Negative for expenses, positive for income." },
                        },
                        required: ['date', 'description', 'category', 'amount'],
                    },
                };

                const result = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: responseSchema,
                    },
                });

                const parsedTransactions = JSON.parse(result.text);

                const standardizedTransactions: Transaction[] = parsedTransactions.map((t: any, index: number) => ({
                    id: Date.now() + index,
                    date: t.date || new Date().toISOString().split('T')[0],
                    description: t.description || 'No Description',
                    category: t.category || 'Uncategorized',
                    amount: typeof t.amount === 'number' ? t.amount : 0,
                    type: (t.amount || 0) >= 0 ? 'income' : 'expense',
                }));

                allTransactions = [...allTransactions, ...standardizedTransactions];

            } catch (e) {
                console.error("AI processing error:", e);
                alert("The AI failed to understand the data structure. Please check the file format and try again.");
                setIsLoading(false);
                return;
            }
        }
        
        setIsLoading(false);

        if (allTransactions.length === 0) {
            const useMock = window.confirm("You haven't entered any transactions. Would you like to view the dashboard with sample data?");
            if (useMock) {
                setTransactions(mockTransactions);
                setView('dashboard');
            }
        } else {
            setTransactions(allTransactions);
            setView('dashboard');
        }
    };

    if (view === 'home') {
        return <HomePage onDashboardReady={handleDashboardReady} isLoading={isLoading} />;
    }

    return (
        <div style={styles.dashboard}>
            <h1 style={styles.header}>Finance Dashboard</h1>
            <main>
                <Overview transactions={transactions} />
                <div style={styles.mainGrid}>
                    <RecentTransactions transactions={transactions} />
                    <SpendingChart transactions={transactions} />
                    <BalanceTrendChart transactions={transactions} />
                </div>
                 <AIFinancialAdvisor transactions={transactions} />
            </main>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
