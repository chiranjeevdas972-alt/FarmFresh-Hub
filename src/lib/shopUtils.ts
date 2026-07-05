export const shopUtils = {
  calculateDiscount(total: number, discountType: 'percentage' | 'fixed', value: number) {
    if (discountType === 'percentage') {
      return total * (value / 100);
    }
    return Math.min(value, total);
  },

  generateWhatsAppMessage(order: any) {
    const items = order.items.map((item: any) => `${item.name} x ${item.quantity} ${item.unit}`).join('%0A');
    const message = `*Farm Fresh Hub Order Confirmation*%0A%0AInvoice: ${order.invoiceNo}%0AItems:%0A${items}%0A%0A*Total: ₹${order.total}*%0APayment: ${order.paymentStatus.toUpperCase()}%0A%0AThank you for using Farm Fresh Hub!`;
    return `https://wa.me/${order.customerPhone || ''}?text=${message}`;
  },

  getSmartPricingSuggestion(currentPrice: number, stockLevel: number, lowThreshold: number) {
    if (stockLevel <= lowThreshold) {
      return currentPrice * 1.05; // Increase price by 5% if stock is low
    }
    if (stockLevel > lowThreshold * 5) {
      return currentPrice * 0.95; // Decrease price by 5% if overstocked
    }
    return currentPrice;
  }
};
