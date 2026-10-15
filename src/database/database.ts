import { SQLiteDatabase } from "expo-sqlite";

//Nombre del archivo de base de datos que se crea dentro del telefono
export const DATABASE_NAME = 'gastos.db';

//Se ejecuta una vez, cada vez que se abre la base (lo llama SQLiteProvider)
//Aqui se crean las tablas si todavia no existen
export async function initDatabase(db: SQLiteDatabase):Promise<void> {
    //execAsync permite ejecutar varias sentencias SQL seguidas.
    //WAL es un modo de escritura que SQLite recomienda: LESTURAS Y ESCRITURAS
    
    await db.execAsync(`
        PRAGMA journal_mode = WAL;
        
        CREATE TABLE IF NOT EXISTS expenses (
        id          TEXT PRIMARY KEY NOT NULL, --el mismo id string que ya usaba la app
        amount      REAL NOT NULL, --REAL = numero con decimales
        category    TEXT NOT NULL, 
        date        TEXT NOT NULL, -- fecha en formato ISO 8601
        description TEXT
        );
    `);
}


