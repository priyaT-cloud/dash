import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- TYPE DEFINITION ---
type AnalysisType = 'personal' | 'business';

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
    card: { backgroundColor: 'var(--surface)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border)', position: 'relative' },
    cardTitle: { margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-secondary)' },
    overviewContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' },
    overviewItem: { backgroundColor: 'var(--surface)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    overviewLabel: { color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
    overviewValue: { fontSize: '1.75rem', fontWeight: 'bold' },
    transactionsList: { listStyle: 'none', padding: '0', margin: '0', maxHeight: '300px', overflowY: 'auto' },
    transactionItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0.5rem', borderBottom: '1px solid var(--border)' },
    transactionDesc: { fontWeight: '500' },
    transactionCat: { fontSize: '0.8rem', color: 'var(--text-secondary)' },
    transactionAmount: { fontWeight: '600' },
    transactionInfo: { display: 'flex', alignItems: 'center', gap: '1rem'},
    aiForm: { display: 'flex', gap: '0.5rem', marginTop: '1rem' },
    aiInput: { flexGrow: 1, padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--background)', color: 'var(--text-primary)', fontSize: '1rem' },
    aiButton: { padding: '0.75rem 1.5rem', border: 'none', borderRadius: '8px', backgroundColor: 'var(--primary)', color: 'white', fontWeight: '600', cursor: 'pointer' },
    aiResponse: { marginTop: '1rem', backgroundColor: 'var(--background)', padding: '1rem', borderRadius: '8px', whiteSpace: 'pre-wrap', lineHeight: '1.6' },
    chartContainer: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    svgChart: { width: '100%', minHeight: '250px', userSelect: 'none' },
    tooltip: { position: 'absolute', backgroundColor: 'rgba(40, 40, 40, 0.9)', color: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', pointerEvents: 'none', transition: 'opacity 0.2s', border: '1px solid var(--border)' },
    homeContainer: { textAlign: 'center', maxWidth: '700px', margin: '2rem auto' },
    form: { display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' },
    inputGroup: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
    input: { width: '100%', boxSizing: 'border-box', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--background)', color: 'var(--text-primary)', fontSize: '1rem', fontFamily: "'Inter', sans-serif" },
    select: { width: '100%', boxSizing: 'border-box', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--background)', color: 'var(--text-primary)', fontSize: '1rem', fontFamily: "'Inter', sans-serif" },
    fullWidth: { gridColumn: '1 / -1' },
    button: { padding: '0.75rem 1.5rem', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '600', cursor: 'pointer' },
    removeButton: { backgroundColor: 'transparent', color: 'var(--danger)', border: 'none', cursor: 'pointer', padding: '0 0 0 1rem' },
    dropZone: { border: '2px dashed var(--border)', borderRadius: '12px', padding: '2rem', marginBottom: '2rem', cursor: 'pointer', transition: 'background-color 0.2s, border-color 0.2s' },
    dropZoneActive: { backgroundColor: 'var(--highlight)', borderColor: 'var(--primary)' },
    orSeparator: { display: 'flex', alignItems: 'center', textAlign: 'center', color: 'var(--text-secondary)', margin: '2rem 0' },
    orSeparatorLine: { flexGrow: 1, height: '1px', backgroundColor: 'var(--border)' },
    orSeparatorText: { padding: '0 1rem' },
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
    analysisTypeSelector: { display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem' },
    analysisTypeButton: { padding: '0.75rem 1.5rem', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s, border-color 0.2s' },
    analysisTypeButtonActive: { padding: '0.75rem 1.5rem', border: '1px solid var(--primary)', borderRadius: '8px', backgroundColor: 'var(--primary)', color: 'white', fontWeight: '600', cursor: 'pointer' },
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
        const cleanHeaderRow = headerRow.charCodeAt(0) === 0xFEFF ? headerRow.substring(1) : headerRow;
        const headers = cleanHeaderRow.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        return rows.map(row => {
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

// --- ICONS ---
const BalanceIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>;
const IncomeIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>;
const ExpenseIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>;
const RevenueIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M5 10l7-7 7 7"/></svg>;
const CostIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M5 14l7 7 7-7"/></svg>;
const ProfitIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 14l5-5 5 5"/></svg>;


// --- COMPONENTS ---
const Overview = ({ transactions, analysisType }: { transactions: Transaction[], analysisType: AnalysisType }) => {
    const { totalIncome, totalExpenses, balance } = useMemo(() => {
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const balance = totalIncome - totalExpenses;
        return { totalIncome, totalExpenses, balance };
    }, [transactions]);

    const isBusiness = analysisType === 'business';

    return (
        <div style={styles.overviewContainer}>
            <div style={styles.overviewItem}>
                <div style={styles.overviewLabel}>{isBusiness ? <ProfitIcon/> : <BalanceIcon/>}{isBusiness ? 'Net Profit' : 'Total Balance'}</div>
                <div style={{...styles.overviewValue, color: balance >= 0 ? 'var(--success)' : 'var(--danger)'}}>{formatCurrency(balance)}</div>
            </div>
            <div style={styles.overviewItem}>
                <div style={styles.overviewLabel}>{isBusiness ? <RevenueIcon/> : <IncomeIcon/>}{isBusiness ? 'Total Revenue' : 'Total Income'}</div>
                <div style={{...styles.overviewValue, color: 'var(--success)'}}>{formatCurrency(totalIncome)}</div>
            </div>
             <div style={styles.overviewItem}>
                <div style={styles.overviewLabel}>{isBusiness ? <CostIcon/> : <ExpenseIcon/>}{isBusiness ? 'Total Costs' : 'Total Expenses'}</div>
                <div style={{...styles.overviewValue, color: 'var(--danger)'}}>{formatCurrency(totalExpenses)}</div>
            </div>
        </div>
    );
};

const DonutChart = ({ data }: { data: { name: string; amount: number; percentage: number }[] }) => {
    const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number } | null>(null);
    const radius = 80;
    const strokeWidth = 30;
    const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1'];
    let accumulatedPercentage = 0;

    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    };

    const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
        const start = polarToCartesian(x, y, radius, endAngle);
        const end = polarToCartesian(x, y, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <div style={{ position: 'relative', width: '200px', height: '200px' }}>
                <svg width="200" height="200" viewBox="0 0 200 200">
                    {data.map((item, index) => {
                        const startAngle = (accumulatedPercentage / 100) * 360;
                        const endAngle = ((accumulatedPercentage + item.percentage) / 100) * 360;
                        accumulatedPercentage += item.percentage;
                        const pathData = describeArc(100, 100, radius - strokeWidth / 2, startAngle, endAngle);
                        return (
                            <path
                                key={item.name}
                                d={pathData}
                                fill="none"
                                stroke={colors[index % colors.length]}
                                strokeWidth={strokeWidth}
                                onMouseMove={(e) => setTooltip({ content: `${item.name}: ${formatCurrency(item.amount)} (${item.percentage.toFixed(1)}%)`, x: e.clientX, y: e.clientY })}
                                onMouseLeave={() => setTooltip(null)}
                            />
                        );
                    })}
                </svg>
                 {tooltip && ReactDOM.createPortal(<div style={{...styles.tooltip, top: tooltip.y + 10, left: tooltip.x + 10}}>{tooltip.content}</div>, document.body)}
            </div>
            <div style={{ flexGrow: 1 }}>
                {data.map((item, index) => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: colors[index % colors.length], marginRight: '0.75rem' }}></span>
                        <span>{item.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SpendingChart = ({ transactions, analysisType }: { transactions: Transaction[], analysisType: AnalysisType }) => {
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
        })).sort((a, b) => b.amount - a.amount).slice(0, 6);
    }, [transactions]);

    return (
        <div style={styles.card}>
            <h2 style={styles.cardTitle}>{analysisType === 'business' ? 'Cost Breakdown' : 'Spending by Category'}</h2>
            {spendingByCategory.length > 0 ? (
                <DonutChart data={spendingByCategory} />
            ) : <p style={{color: 'var(--text-secondary)'}}>No expense data to display.</p>}
        </div>
    );
};

const BalanceTrendChart = ({ transactions }: { transactions: Transaction[] }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number } | null>(null);

    const chartData = useMemo(() => {
        if (transactions.length < 2) return null;
        const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const balancePoints: { date: Date; balance: number }[] = [];
        let runningBalance = 0;
        sorted.forEach(t => {
            runningBalance += t.amount;
            balancePoints.push({ date: new Date(t.date), balance: runningBalance });
        });
        const yValues = balancePoints.map(p => p.balance);
        const xValues = balancePoints.map(p => p.date.getTime());
        const yMin = Math.min(...yValues);
        const yMax = Math.max(...yValues);
        const xMin = Math.min(...xValues);
        const xMax = Math.max(...xValues);
        return { points: balancePoints, yMin, yMax, xMin, xMax };
    }, [transactions]);

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!chartData || !svgRef.current) return;
        const svgRect = svgRef.current.getBoundingClientRect();
        const svgX = e.clientX - svgRect.left;
        const width = svgRect.width - 50;
        const { points, xMin, xMax } = chartData;
        const dateRange = xMax - xMin;
        const mouseDate = xMin + (svgX - 40) / width * dateRange;
        let closestPoint = points[0];
        let minDiff = Math.abs(mouseDate - closestPoint.date.getTime());
        for (let i = 1; i < points.length; i++) {
            const diff = Math.abs(mouseDate - points[i].date.getTime());
            if (diff < minDiff) {
                minDiff = diff;
                closestPoint = points[i];
            }
        }
        const pointX = 40 + ((closestPoint.date.getTime() - xMin) / dateRange) * width;
        const pointY = 10 + (1 - (closestPoint.balance - chartData.yMin) / (chartData.yMax - chartData.yMin)) * (svgRect.height - 40);
        setTooltip({
            content: `${closestPoint.date.toLocaleDateString()}: ${formatCurrency(closestPoint.balance)}`,
            x: pointX,
            y: pointY,
        });
    };
    
    const handleMouseLeave = () => setTooltip(null);
    
    if (!chartData) return <div style={styles.card}><h2 style={styles.cardTitle}>Balance Trend</h2><p style={{color: 'var(--text-secondary)'}}>Not enough data for a trend line.</p></div>;

    const { points, yMin, yMax, xMin, xMax } = chartData;
    const padding = { top: 10, right: 10, bottom: 30, left: 40 };
    const width = 500, height = 250;
    const contentWidth = width - padding.left - padding.right;
    const contentHeight = height - padding.top - padding.bottom;
    const dateRange = xMax - xMin || 1;
    const balanceRange = yMax - yMin || 1;
    const toSvgX = (date: number) => padding.left + ((date - xMin) / dateRange) * contentWidth;
    const toSvgY = (balance: number) => padding.top + (1 - (balance - yMin) / balanceRange) * contentHeight;
    const linePath = points.map(p => `${toSvgX(p.date.getTime())},${toSvgY(p.balance)}`).join(' L ');
    const areaPath = `M ${toSvgX(points[0].date.getTime())},${height - padding.bottom} L ${linePath} L ${toSvgX(points[points.length-1].date.getTime())},${height - padding.bottom} Z`;

    return (
        <div style={styles.card}>
            <h2 style={styles.cardTitle}>Balance Trend</h2>
            <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} style={styles.svgChart} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
                <defs><linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4"/><stop offset="100%" stopColor="var(--primary)" stopOpacity="0"/></linearGradient></defs>
                {[yMin, yMin + balanceRange/2, yMax].map(label => (
                    <g key={label}><text x={padding.left - 5} y={toSvgY(label)} dy="0.3em" textAnchor="end" fill="var(--text-secondary)" fontSize="10">{formatCurrency(label).replace('$', '')[0]}k</text><line x1={padding.left} y1={toSvgY(label)} x2={width-padding.right} y2={toSvgY(label)} stroke="var(--border)" strokeWidth="0.5" /></g>
                ))}
                <text x={padding.left} y={height - 5} fill="var(--text-secondary)" fontSize="10">{new Date(xMin).toLocaleDateString()}</text>
                <text x={width - padding.right} y={height - 5} textAnchor="end" fill="var(--text-secondary)" fontSize="10">{new Date(xMax).toLocaleDateString()}</text>
                <path d={areaPath} fill="url(#areaGradient)" /><path d={`M ${linePath}`} fill="none" stroke="var(--primary)" strokeWidth="2" />
                {tooltip && <g><line x1={tooltip.x} y1={padding.top} x2={tooltip.x} y2={height - padding.bottom} stroke="var(--text-secondary)" strokeDasharray="4 2" /><circle cx={tooltip.x} cy={tooltip.y} r="4" fill="var(--primary)" stroke="var(--background)" strokeWidth="2" /><foreignObject x={tooltip.x > width / 2 ? tooltip.x - 120 : tooltip.x + 10} y={padding.top} width="110" height="40"><div style={{...styles.tooltip, position: 'static', opacity: 1}}>{tooltip.content}</div></foreignObject></g>}
            </svg>
        </div>
    );
};

const ProfitLossChart = ({ transactions }: { transactions: Transaction[] }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [tooltip, setTooltip] = useState<{ content: string, x: number, y: number } | null>(null);

    const monthlyData = useMemo(() => {
        const data: { [key: string]: { profit: number, revenue: number, cost: number } } = {};
        transactions.forEach(t => {
            const month = t.date.substring(0, 7);
            if (!data[month]) data[month] = { profit: 0, revenue: 0, cost: 0 };
            if (t.type === 'income') data[month].revenue += t.amount;
            else data[month].cost += Math.abs(t.amount);
            data[month].profit += t.amount;
        });
        return Object.entries(data).map(([month, values]) => ({ month, ...values })).sort((a, b) => a.month.localeCompare(b.month));
    }, [transactions]);

    if (monthlyData.length === 0) return <div style={styles.card}><h2 style={styles.cardTitle}>Monthly Profit/Loss</h2><p style={{ color: 'var(--text-secondary)' }}>Not enough data to display.</p></div>;

    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 500, height = 250;
    const contentWidth = width - padding.left - padding.right;
    const contentHeight = height - padding.top - padding.bottom;
    const maxProfit = Math.max(...monthlyData.map(d => d.profit), 0);
    const minProfit = Math.min(...monthlyData.map(d => d.profit), 0);
    const range = maxProfit - minProfit;
    const barWidth = contentWidth / monthlyData.length * 0.7;

    const toSvgY = (value: number) => contentHeight - ((value - minProfit) / range) * contentHeight + padding.top;
    const zeroLine = toSvgY(0);

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>, data: any) => {
        const svgRect = svgRef.current!.getBoundingClientRect();
        setTooltip({
            content: `<div><strong>${data.month}</strong></div><div>Profit: ${formatCurrency(data.profit)}</div><div>Revenue: ${formatCurrency(data.revenue)}</div><div>Cost: ${formatCurrency(data.cost)}</div>`,
            x: e.clientX,
            y: e.clientY,
        });
    };

    return (
        <div style={styles.card}>
            <h2 style={styles.cardTitle}>Monthly Profit/Loss</h2>
            <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} style={styles.svgChart}>
                <line x1={padding.left} y1={zeroLine} x2={width - padding.right} y2={zeroLine} stroke="var(--border)" />
                {monthlyData.map((data, i) => {
                    const x = padding.left + (contentWidth / monthlyData.length) * (i + 0.5) - barWidth / 2;
                    const y = toSvgY(data.profit);
                    const barHeight = Math.abs(y - zeroLine);
                    return (
                        <rect
                            key={data.month}
                            x={x}
                            y={data.profit >= 0 ? y : zeroLine}
                            width={barWidth}
                            height={barHeight}
                            fill={data.profit >= 0 ? 'var(--success)' : 'var(--danger)'}
                            onMouseMove={(e) => handleMouseMove(e, data)}
                            onMouseLeave={() => setTooltip(null)}
                        />
                    );
                })}
            </svg>
            {tooltip && ReactDOM.createPortal(<div style={{ ...styles.tooltip, top: tooltip.y + 10, left: tooltip.x + 10 }} dangerouslySetInnerHTML={{ __html: tooltip.content }}></div>, document.body)}
        </div>
    );
};


const RecentTransactions = ({ transactions }: { transactions: Transaction[] }) => (
    <div style={styles.card}>
        <h2 style={styles.cardTitle}>Recent Transactions</h2>
        <ul style={styles.transactionsList}>
            {transactions.length > 0 ? [...transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10).map(t => (
                <li key={t.id} style={styles.transactionItem}>
                    <div style={styles.transactionInfo}>
                        <div style={{color: t.type === 'income' ? 'var(--success)' : 'var(--danger)'}}>
                            {t.type === 'income' ? <IncomeIcon /> : <ExpenseIcon />}
                        </div>
                        <div>
                            <div style={styles.transactionDesc}>{t.description}</div>
                            <div style={styles.transactionCat}>{t.category}</div>
                        </div>
                    </div>
                    <div style={{...styles.transactionAmount, color: t.type === 'income' ? 'var(--success)' : 'var(--text-primary)'}}>
                        {t.type === 'expense' ? '-' : ''}{formatCurrency(Math.abs(t.amount))}
                    </div>
                </li>
            )) : <p style={{color: 'var(--text-secondary)'}}>No transactions yet.</p>}
        </ul>
    </div>
);

const AIFinancialAdvisor = ({ transactions, analysisType }: { transactions: Transaction[], analysisType: AnalysisType }) => {
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const isBusiness = analysisType === 'business';

    const getInsights = async () => {
        if (!query || transactions.length === 0) return;
        setLoading(true);
        setError('');
        setResponse('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const transactionsSummary = JSON.stringify(transactions.slice(0, 50), null, 2);
            const prompt = `
                You are an expert ${isBusiness ? 'business analyst' : 'financial advisor'}. Based on the following JSON transaction data, answer the user's question.
                Provide a short, accurate, and actionable response.

                Transaction Data (income is positive, expenses are negative):
                ${transactionsSummary}

                User's Question:
                "${query}"
            `;

            const result = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
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
            <h2 style={styles.cardTitle}>{isBusiness ? 'AI Business Analyst' : 'AI Financial Advisor'}</h2>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)'}}>{isBusiness ? 'Ask about profitability, cost centers, or revenue streams.' : 'Ask about your spending, savings, or budget.'}</p>
            <form style={styles.aiForm} onSubmit={e => { e.preventDefault(); getInsights(); }}>
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={isBusiness ? 'e.g., "Which month was most profitable?"' : 'e.g., "Where can I save money?"'}
                    style={styles.aiInput}
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

const HomePage = ({ onDashboardReady, isLoading }: { onDashboardReady: (manual: Transaction[], raw: Array<Record<string, string>> | null, type: AnalysisType) => void, isLoading: boolean }) => {
    const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);
    const [rawCsvData, setRawCsvData] = useState<Array<Record<string, string>> | null>(null);
    const [uploadInfo, setUploadInfo] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Food & Drink');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [isDragging, setIsDragging] = useState(false);
    const [pastedData, setPastedData] = useState('');
    const [analysisType, setAnalysisType] = useState<AnalysisType>('personal');

    const handleAddTransaction = (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseFloat(amount);
        if (!description || !category || isNaN(numericAmount) || numericAmount <= 0) {
            alert("Please fill all fields with valid data.");
            return;
        }
        const newTransaction: Transaction = { id: Date.now(), date: new Date().toISOString().split('T')[0], description, category, amount: type === 'expense' ? -numericAmount : numericAmount, type };
        setUserTransactions(prev => [newTransaction, ...prev]);
        setDescription('');
        setAmount('');
    };
    
    const handleRemoveTransaction = (id: number) => setUserTransactions(userTransactions.filter(t => t.id !== id));
    
    const handleDragEvents = (e: React.DragEvent, action: 'enter' | 'leave' | 'over') => {
        e.preventDefault();
        e.stopPropagation();
        if (action === 'enter' || action === 'over') setIsDragging(true);
        else if (action === 'leave') setIsDragging(false);
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
        if (!pastedData.trim()) { alert("Please paste some data first."); return; }
        const parsed = parseCSV(pastedData);
        if (parsed.length > 0) {
            setRawCsvData(parsed);
            setUploadInfo(`${parsed.length} rows loaded from pasted data.`);
            setPastedData('');
        }
    };

    const categories = ['Food & Drink', 'Groceries', 'Transport', 'Entertainment', 'Shopping', 'Housing', 'Utilities', 'Income', 'Revenue', 'COGS', 'Marketing', 'Salaries'];

    return (
        <div style={styles.homeContainer}>
            <h1 style={styles.header}>Welcome</h1>
            <p style={{color: 'var(--text-secondary)', marginBottom: '1rem'}}>First, select your analysis type.</p>
            
            <div style={styles.analysisTypeSelector}>
                <button style={analysisType === 'personal' ? styles.analysisTypeButtonActive : styles.analysisTypeButton} onClick={() => setAnalysisType('personal')}>Personal Analysis</button>
                <button style={analysisType === 'business' ? styles.analysisTypeButtonActive : styles.analysisTypeButton} onClick={() => setAnalysisType('business')}>Business Analysis</button>
            </div>
            
            <p style={{color: 'var(--text-secondary)', marginBottom: '2rem'}}>Then upload a CSV, paste data, or add transactions manually.</p>
            
            <div style={{...styles.dropZone, ...(isDragging ? styles.dropZoneActive : {})}} onDragEnter={(e) => handleDragEvents(e, 'enter')} onDragOver={(e) => handleDragEvents(e, 'over')} onDragLeave={(e) => handleDragEvents(e, 'leave')} onDrop={handleDrop}>
                <p><strong>Drag & Drop your CSV file here</strong></p>
                <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Our AI will analyze your columns for you.</p>
                {uploadInfo && <p style={{color: 'var(--success)'}}>{uploadInfo}</p>}
            </div>

            <div style={styles.orSeparator}><div style={styles.orSeparatorLine}></div><span style={styles.orSeparatorText}>OR</span><div style={styles.orSeparatorLine}></div></div>

            <div style={styles.card}>
                <h2 style={styles.cardTitle}>Paste Transaction Data</h2>
                <form style={styles.form} onSubmit={handleProcessPastedData}>
                     <p style={{color: 'var(--text-secondary)', margin: '-0.5rem 0 0.5rem 0', fontSize: '0.9rem'}}>Paste comma-separated data. The first row should be headers.</p>
                    <textarea style={styles.textArea} placeholder={"Date,Details,Amount\n2024-07-25,Groceries,-55.20"} value={pastedData} onChange={e => setPastedData(e.target.value)} />
                    <button type="submit" style={{...styles.button, backgroundColor: 'var(--primary)'}}>Process Pasted Data</button>
                </form>
            </div>
            
            <div style={styles.orSeparator}><div style={styles.orSeparatorLine}></div><span style={styles.orSeparatorText}>OR</span><div style={styles.orSeparatorLine}></div></div>

            <div style={styles.card}>
                <h2 style={styles.cardTitle}>Add a Single Transaction</h2>
                <form style={styles.form} onSubmit={handleAddTransaction}>
                    <input type="text" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} style={{...styles.input, ...styles.fullWidth}} required />
                    <div style={styles.inputGroup}>
                        <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} style={styles.input} min="0.01" step="0.01" required />
                        <select value={type} onChange={e => setType(e.target.value as 'income' | 'expense')} style={styles.select}>
                            <option value="expense">{analysisType === 'business' ? 'Cost' : 'Expense'}</option>
                            <option value="income">{analysisType === 'business' ? 'Revenue' : 'Income'}</option>
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
                        {userTransactions.map(t => (<li key={t.id} style={styles.transactionItem}><div><div style={styles.transactionDesc}>{t.description}</div><div style={styles.transactionCat}>{t.category}</div></div><div style={{display: 'flex', alignItems: 'center'}}><span style={{...styles.transactionAmount, color: t.type === 'income' ? 'var(--success)' : 'var(--text-primary)'}}>{formatCurrency(t.amount)}</span><button onClick={() => handleRemoveTransaction(t.id)} style={styles.removeButton} aria-label={`Remove ${t.description}`}>&times;</button></div></li>))}
                    </ul>
                </div>
            )}

            <button onClick={() => onDashboardReady(userTransactions, rawCsvData, analysisType)} style={{...styles.button, backgroundColor: 'var(--success)', marginTop: '2rem', width: '100%', padding: '1rem', opacity: (userTransactions.length === 0 && !rawCsvData) || isLoading ? 0.6 : 1}} disabled={(userTransactions.length === 0 && !rawCsvData) || isLoading}>
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
    const [analysisType, setAnalysisType] = useState<AnalysisType>('personal');

    const handleDashboardReady = async (manualTransactions: Transaction[], rawData: Array<Record<string, string>> | null, type: AnalysisType) => {
        setAnalysisType(type);
        let allTransactions: Transaction[] = [...manualTransactions];

        if (rawData && rawData.length > 0) {
            setIsLoading(true);
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const isBusiness = type === 'business';
                const prompt = `
                    You are an intelligent data processor for ${isBusiness ? 'business' : 'personal'} financial data. Analyze raw JSON from a user's CSV and convert it into a standardized list of transactions. Intelligently identify columns for date, description, category, and amount.
                    The target format is a JSON array of objects with keys: "date", "description", "category", "amount".
                    Rules:
                    1. Amount: Identify ${isBusiness ? 'revenues and costs' : 'income and expenses'}. Represent ${isBusiness ? 'revenues' : 'income'} as POSITIVE numbers and ${isBusiness ? 'costs' : 'expenses'} as NEGATIVE numbers. Clean currency symbols.
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
                            date: { type: Type.STRING },
                            description: { type: Type.STRING },
                            category: { type: Type.STRING },
                            amount: { type: Type.NUMBER },
                        },
                        required: ['date', 'description', 'category', 'amount'],
                    },
                };

                const result = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: { responseMimeType: "application/json", responseSchema: responseSchema },
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
                alert("The AI failed to understand the data. Please check the format and try again.");
                setIsLoading(false);
                return;
            }
        }
        
        setIsLoading(false);

        if (allTransactions.length === 0) {
            const useMock = window.confirm("No transactions entered. View dashboard with sample data?");
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
            <h1 style={styles.header}>{analysisType === 'business' ? 'Business Dashboard' : 'Finance Dashboard'}</h1>
            <main>
                <Overview transactions={transactions} analysisType={analysisType} />
                <div style={styles.mainGrid}>
                    <RecentTransactions transactions={transactions} />
                    <SpendingChart transactions={transactions} analysisType={analysisType} />
                    {analysisType === 'business' ? <ProfitLossChart transactions={transactions} /> : <BalanceTrendChart transactions={transactions} />}
                </div>
                 <AIFinancialAdvisor transactions={transactions} analysisType={analysisType} />
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
