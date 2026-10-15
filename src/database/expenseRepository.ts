import { SQLiteDatabase } from "expo-sqlite";
import { Category, Expense } from '@/types/expense'

interface ExpenseRow {
    id: string;
    amount: number;
    category: string;
    date: string;
    description: string | null;
}

function rowToExpense(row: ExpenseRow):Expense {
    return {
        id: row.id,
        amount: row.amount,
        category: row.category as Category,
        date: new   Date(row.date), //texto ISO -> Date
        description: row.description ?? undefined, //null -> undefined
    };
}

export async function getAllExpenses(db: SQLiteDatabase):Promise<Expense[]> {
    const rows = await db.getAllAsync<ExpenseRow>(
        'SELECT id, amount, category, date, description FROM expenses ORDER BY date DESC'
    );
    return rows.map(rowToExpense);
}

export async function insertExpense(db: SQLiteDatabase, expense: Expense):Promise<void> {
    await db.runAsync(
        'INSERT INTO expenses (id, amount, category, date, description) VALUES (?, ?, ?, ?, ?)',
        expense.id,
        expense.amount,
        expense.category,
        expense.date.toISOString(), //Date -> texto ISO
        expense.description ?? null //undefined -> NULL
    );
}