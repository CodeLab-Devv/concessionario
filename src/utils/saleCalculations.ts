export const calculateSaleTotal = (price: number, quantity: number, discountType?: 'employee' | 'collaboration' | null): number => {
  let total = price * quantity;
  
  if (discountType === 'employee') {
    total *= 0.8; // 20% discount
  } else if (discountType === 'collaboration') {
    total *= 0.7; // 30% discount
  }
  
  return total;
};

export const getDiscountPercentage = (discountType?: 'employee' | 'collaboration' | null): number => {
  switch (discountType) {
    case 'employee':
      return 20;
    case 'collaboration':
      return 30;
    default:
      return 0;
  }
};

export const formatDiscountText = (discountType?: 'employee' | 'collaboration' | null): string => {
  switch (discountType) {
    case 'employee':
      return 'Dipendente (20%)';
    case 'collaboration':
      return 'Collaborazione (30%)';
    default:
      return 'Nessuno';
  }
};