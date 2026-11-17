export type Label =
  | 'Bills'
  | 'Food'
  | 'UN Food'
  | 'Giveaway'
  | 'Home'
  | 'Travel';

export const LABELS: Label[] = ['Bills', 'Food', 'UN Food', 'Giveaway', 'Home', 'Travel'];

export const LABEL_COLORS: Record<Label, string> = {
  Bills: '#F5A623',
  Food: '#4CAF50',
  'UN Food': '#26C6DA',
  Giveaway: '#E040FB',
  Home: '#5C6BC0',
  Travel: '#FF5252',
};
