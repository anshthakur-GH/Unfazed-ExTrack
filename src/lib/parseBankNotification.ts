export type Bank = 'IDFC' | 'KOTAK' | 'BOB' | 'IPPB' | 'OTHER';
export type TxnType = 'credit' | 'debit';

export interface ParsedTransaction {
  bank: Bank;
  type: TxnType;
  amount: number;
  accountLast4: string | null;
  balance: number | null;
  rawText: string;
  source: string;
}

interface BankRule {
  bank: Bank;
  idKeywords: RegExp;
}

const BANK_RULES: BankRule[] = [
  { bank: 'IDFC', idKeywords: /idfc/i },
  { bank: 'KOTAK', idKeywords: /kotak/i },
  { bank: 'BOB', idKeywords: /bank of baroda|\bbob\b/i },
  { bank: 'IPPB', idKeywords: /ippb|india post payments bank/i },
];

const AMOUNT_RULES: { type: TxnType; regex: RegExp }[] = [
  // credit-leaning phrasings
  { type: 'credit', regex: /credited\s+with\s+(?:inr|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i },
  { type: 'credit', regex: /received\s+(?:a\s+payment\s+of\s+)?rs\.?\s*([\d,]+(?:\.\d{1,2})?)/i },
  { type: 'credit', regex: /rs\.?\s*([\d,]+(?:\.\d{1,2})?)\s*credited\s+to/i },
  { type: 'credit', regex: /rs\.?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:is\s+)?credited/i },
  // debit-leaning phrasings
  { type: 'debit', regex: /debited\s+by\s+rs\.?\s*([\d,]+(?:\.\d{1,2})?)/i },
  { type: 'debit', regex: /sent\s+rs\.?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:from)?/i },
  { type: 'debit', regex: /rs\.?\s*([\d,]+(?:\.\d{1,2})?)\s*dr\.?\s*from/i },
  { type: 'debit', regex: /debit\s+rs\.?\s*([\d,]+(?:\.\d{1,2})?)\s*for/i },
  { type: 'debit', regex: /debited\s+(?:rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i },
];

const BALANCE_REGEX = /(?:avl\.?\s*bal(?:ance)?|available\s+balance|new\s+balance|total\s+bal(?:ance)?|avlbl\s+amt)[^0-9]{0,15}(?:is\s+)?(?:inr|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i;

const ACCOUNT_REGEX = /[xX]{2,}\s*(\d{3,6})/;

function toNumber(raw: string): number {
  return parseFloat(raw.replace(/,/g, ''));
}

export function parseBankNotification(rawText: string, source = ''): ParsedTransaction | null {
  const text = rawText.replace(/\s+/g, ' ').trim();
  if (!text) return null;

  const bankMatch = BANK_RULES.find((r) => r.idKeywords.test(text) || r.idKeywords.test(source));
  if (!bankMatch) return null;

  let type: TxnType | null = null;
  let amount: number | null = null;
  for (const rule of AMOUNT_RULES) {
    const m = text.match(rule.regex);
    if (m) {
      type = rule.type;
      amount = toNumber(m[1]);
      break;
    }
  }
  if (!type || amount === null) return null;

  const accountMatch = text.match(ACCOUNT_REGEX);
  const accountLast4 = accountMatch ? accountMatch[1].slice(-4) : null;

  const balanceMatch = text.match(BALANCE_REGEX);
  const balance = balanceMatch ? toNumber(balanceMatch[1]) : null;

  return {
    bank: bankMatch.bank,
    type,
    amount,
    accountLast4,
    balance,
    rawText: text,
    source,
  };
}
