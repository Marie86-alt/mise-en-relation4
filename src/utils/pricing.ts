// src/utils/pricing.ts

export interface PricingResult {
  hours: number;
  basePrice: number;
  finalPrice: number;
  discount: number;
  discountPercentage: number;
  hourlyRate: number;
}

export class PricingService {
  // 🎯 Taux horaire fixe
  private static readonly HOURLY_RATE = 22;

  // 🎁 Réductions spéciales
  private static readonly SPECIAL_OFFERS = {
    3: 60, // 3h = 60€ au lieu de 66€
    // Vous pouvez ajouter d'autres offres :
    // 5: 100, // 5h = 100€ au lieu de 110€
    // 8: 160, // 8h = 160€ au lieu de 176€
  };

  /**
   * Calcule le prix total selon la durée
   */
  static calculatePrice(hours: number): PricingResult {
    const basePrice = hours * this.HOURLY_RATE;
    
    // Vérifier s'il y a une offre spéciale
    const specialPrice = this.SPECIAL_OFFERS[hours as keyof typeof this.SPECIAL_OFFERS];
    
    if (specialPrice) {
      const discount = basePrice - specialPrice;
      const discountPercentage = Math.round((discount / basePrice) * 100);
      
      return {
        hours,
        basePrice,
        finalPrice: specialPrice,
        discount,
        discountPercentage,
        hourlyRate: this.HOURLY_RATE
      };
    }

    // Pas d'offre spéciale = prix normal
    return {
      hours,
      basePrice,
      finalPrice: basePrice,
      discount: 0,
      discountPercentage: 0,
      hourlyRate: this.HOURLY_RATE
    };
  }

  /**
   * Calcule le prix à partir d'heures de début/fin
   */
  static calculatePriceFromTimeRange(startTime: string, endTime: string): PricingResult {
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    
    if (end <= start) {
      throw new Error('L\'heure de fin doit être après l\'heure de début');
    }

    const diffMs = end.getTime() - start.getTime();
    const hours = diffMs / (1000 * 60 * 60);
    
    return this.calculatePrice(hours);
  }

  /**
   * Formate le prix pour l'affichage
   */
  static formatPrice(price: number): string {
    return `${price.toFixed(2).replace('.', ',')}€`;
  }

  /**
   * Génère un résumé de prix lisible
   */
  static getPricingSummary(pricingResult: PricingResult): string {
    const { hours, basePrice, finalPrice, discount, discountPercentage } = pricingResult;
    
    if (discount > 0) {
      return `${hours}h → ${this.formatPrice(finalPrice)} (au lieu de ${this.formatPrice(basePrice)}) - Économie : ${this.formatPrice(discount)} (${discountPercentage}%)`;
    }
    
    return `${hours}h → ${this.formatPrice(finalPrice)}`;
  }

  /**
   * Calcule la commission de l'application (40%)
   */
  static calculateCommission(finalPrice: number): {
    helperAmount: number;
    appCommission: number;
    commissionRate: number;
  } {
    const commissionRate = 0.40; // 40%
    const appCommission = finalPrice * commissionRate;
    const helperAmount = finalPrice - appCommission;

    return {
      helperAmount,
      appCommission,
      commissionRate
    };
  }
}

// 🧪 Tests rapides (à supprimer en production)
export const testPricing = () => {
  console.log('=== Tests de Tarification ===');
  
  // Test 1h
  const price1h = PricingService.calculatePrice(1);
  console.log('1h:', PricingService.getPricingSummary(price1h));
  
  // Test 2h
  const price2h = PricingService.calculatePrice(2);
  console.log('2h:', PricingService.getPricingSummary(price2h));
  
  // Test 3h (avec réduction)
  const price3h = PricingService.calculatePrice(3);
  console.log('3h:', PricingService.getPricingSummary(price3h));
  
  // Test 4h
  const price4h = PricingService.calculatePrice(4);
  console.log('4h:', PricingService.getPricingSummary(price4h));
  
  // Test avec horaires
  const priceTimeRange = PricingService.calculatePriceFromTimeRange('14:00', '17:00');
  console.log('14h-17h:', PricingService.getPricingSummary(priceTimeRange));
  
  // Test commission
  const commission = PricingService.calculateCommission(60);
  console.log('Commission sur 60€:', commission);
};