export type Currency = 'PYG' | 'USD';
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'changes_requested' | 'rejected';
export interface BusinessProfile {
  businessName: string; contactName: string; email: string; phone: string; address: string;
  currency: Currency; logoDataUrl: string; defaultTerms: string;
}
export interface Client {
  id: string; name: string; email: string; phone: string; address: string; createdAt: string;
}
export interface Service {
  id: string; name: string; description: string; unit: string; price: number; createdAt: string;
}
export interface QuoteItem { description: string; quantity: number; unitPrice: number; }
export interface QuoteInput {
  title: string; clientId: string; items: QuoteItem[]; discountPercent: number;
  validUntil: string; notes: string; terms: string;
}
export interface Quote extends QuoteInput {
  id: string; number: string; status: QuoteStatus; currency: Currency;
  subtotal: number; discount: number; total: number;
  client: Client; business: BusinessProfile;
  token: string | null; createdAt: string; updatedAt: string; responseNote: string;
}
export interface Usage { used: number; limit: number; month: string; plan: 'free' | 'professional'; }
export interface WorkspaceData {
  user: { name: string; email: string }; profile: BusinessProfile;
  clients: Client[]; services: Service[]; quotes: Quote[]; usage: Usage;
  billing: { enabled: boolean; monthlyPrice: number; annualPrice: number };
}
export interface PublicQuote { quote: Quote; expired: boolean; }
