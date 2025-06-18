import { FIXED_CARTELAS } from "./fixed-cartelas";
import { db } from "./db";
import { cartelas } from "@shared/schema";
import { eq, and } from "drizzle-orm";

// Convert hardcoded cartela to unified format
function convertHardcodedCartela(hardcodedCartela: any): {
  pattern: number[][];
  numbers: number[];
  name: string;
} {
  const pattern: number[][] = [];
  const numbers: number[] = [];
  
  // Convert B-I-N-G-O format to 5x5 pattern and flat numbers array
  const columns = ['B', 'I', 'N', 'G', 'O'];
  
  for (let row = 0; row < 5; row++) {
    const currentRow: number[] = [];
    for (let col = 0; col < 5; col++) {
      const value = hardcodedCartela[columns[col]][row];
      if (value === "FREE") {
        currentRow.push(0); // Use 0 to represent FREE
        numbers.push(0);
      } else {
        currentRow.push(value);
        numbers.push(value);
      }
    }
    pattern.push(currentRow);
  }
  
  return {
    pattern,
    numbers,
    name: `Cartela ${hardcodedCartela.Board}`
  };
}

// Load hardcoded cartelas into database for a specific shop
export async function loadHardcodedCartelas(shopId: number, adminId: number): Promise<void> {
  console.log(`Loading hardcoded cartelas for shop ${shopId}...`);
  
  for (const hardcodedCartela of FIXED_CARTELAS) {
    const cartelaNumber = hardcodedCartela.Board;
    
    // Check if cartela already exists for this shop
    const existing = await db
      .select()
      .from(cartelas)
      .where(
        and(
          eq(cartelas.shopId, shopId),
          eq(cartelas.cartelaNumber, cartelaNumber)
        )
      )
      .limit(1);
    
    if (existing.length === 0) {
      // Convert and insert hardcoded cartela
      const converted = convertHardcodedCartela(hardcodedCartela);
      
      await db.insert(cartelas).values({
        shopId,
        adminId,
        cartelaNumber,
        name: converted.name,
        pattern: converted.pattern,
        numbers: converted.numbers,
        isHardcoded: true,
        isActive: true,
      });
      
      console.log(`Loaded hardcoded cartela ${cartelaNumber} for shop ${shopId}`);
    }
  }
  
  console.log(`Finished loading hardcoded cartelas for shop ${shopId}`);
}

// Ensure all shops have hardcoded cartelas loaded
export async function ensureHardcodedCartelasLoaded(): Promise<void> {
  // This can be called during app startup or when a new shop is created
  // For now, we'll implement this as a manual trigger
  console.log("Hardcoded cartela loader ready");
}