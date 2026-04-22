
import { db } from "../server/db";
import { 
  paketProgress, 
  cashbackReward, 
  principalSubscription, 
  principalClaim, 
  pointSaldo, 
  promoHasil, 
  labelQuotas,
  cuttingProgress
} from "../shared/schema";

async function resetPromoData() {
  console.log("Starting promo data reset...");
  
  try {
    console.log("- Clearing paket_progress...");
    await db.delete(paketProgress);
    
    console.log("- Clearing cashback_reward...");
    await db.delete(cashbackReward);
    
    console.log("- Clearing principal_subscription...");
    await db.delete(principalSubscription);
    
    console.log("- Clearing principal_claim...");
    await db.delete(principalClaim);
    
    console.log("- Clearing point_saldo...");
    await db.delete(pointSaldo);
    
    console.log("- Clearing promo_hasil...");
    await db.delete(promoHasil);
    
    console.log("- Clearing label_quotas...");
    await db.delete(labelQuotas);
    
    console.log("- Clearing cutting_progress...");
    await db.delete(cuttingProgress);
    
    console.log("\nSuccess! All progress and result tables have been cleared.");
    console.log("Note: promo_integrated_transactions was NOT deleted.");
  } catch (error) {
    console.error("Error during reset:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

resetPromoData();
