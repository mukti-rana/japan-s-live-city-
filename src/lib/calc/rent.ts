export interface RentInputs {
  monthlyRent: number;
  depositMonths: number;
  keyMoneyMonths: number;
  agencyFeeMonths: number;
  guarantorFeeMonths: number;
  fireInsurance: number;
  keyExchangeFee: number;
}

export interface RentLineItem {
  label: string;
  labelJa: string;
  amount: number;
}

export interface RentResult {
  lineItems: RentLineItem[];
  total: number;
  totalInMonthsRent: number;
}

export function calculateMoveInCost(inputs: RentInputs): RentResult {
  const rent = Math.max(inputs.monthlyRent, 0);
  const deposit = rent * Math.max(inputs.depositMonths, 0);
  const keyMoney = rent * Math.max(inputs.keyMoneyMonths, 0);
  const agencyFee = rent * Math.max(inputs.agencyFeeMonths, 0);
  const guarantorFee = rent * Math.max(inputs.guarantorFeeMonths, 0);
  const fireInsurance = Math.max(inputs.fireInsurance, 0);
  const keyExchangeFee = Math.max(inputs.keyExchangeFee, 0);

  const lineItems: RentLineItem[] = [
    { label: "First month's rent", labelJa: "前家賃", amount: rent },
    { label: "Deposit", labelJa: "敷金", amount: deposit },
    { label: "Key money", labelJa: "礼金", amount: keyMoney },
    { label: "Agency fee", labelJa: "仲介手数料", amount: agencyFee },
    { label: "Guarantor company fee", labelJa: "保証料", amount: guarantorFee },
    { label: "Fire insurance", labelJa: "火災保険", amount: fireInsurance },
    { label: "Key exchange fee", labelJa: "鍵交換費", amount: keyExchangeFee },
  ];

  const total = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const totalInMonthsRent = rent > 0 ? total / rent : 0;

  return { lineItems, total, totalInMonthsRent };
}
