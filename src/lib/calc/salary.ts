export type PayType = "hourly" | "monthly";

export interface SalaryInputs {
  payType: PayType;
  hourlyWage: number;
  monthlySalary: number;
  hoursPerWeek: number;
  overtimeHoursPerWeek: number;
}

export interface SalaryResult {
  hourlyEquivalent: number;
  basePayMonthly: number;
  overtimePayMonthly: number;
  totalMonthly: number;
  totalAnnual: number;
}

const WEEKS_PER_MONTH = 52 / 12;
const OVERTIME_MULTIPLIER = 1.25; // Japan's statutory minimum overtime premium

export function calculateSalary(inputs: SalaryInputs): SalaryResult {
  const hoursPerWeek = Math.max(inputs.hoursPerWeek, 0);
  const overtimeHoursPerWeek = Math.max(inputs.overtimeHoursPerWeek, 0);

  let hourlyEquivalent: number;
  let basePayMonthly: number;

  if (inputs.payType === "hourly") {
    hourlyEquivalent = Math.max(inputs.hourlyWage, 0);
    basePayMonthly = hourlyEquivalent * hoursPerWeek * WEEKS_PER_MONTH;
  } else {
    const monthlySalary = Math.max(inputs.monthlySalary, 0);
    basePayMonthly = monthlySalary;
    const monthlyHours = hoursPerWeek * WEEKS_PER_MONTH;
    hourlyEquivalent = monthlyHours > 0 ? monthlySalary / monthlyHours : 0;
  }

  const overtimePayMonthly =
    hourlyEquivalent * OVERTIME_MULTIPLIER * overtimeHoursPerWeek * WEEKS_PER_MONTH;

  const totalMonthly = basePayMonthly + overtimePayMonthly;
  const totalAnnual = totalMonthly * 12;

  return {
    hourlyEquivalent,
    basePayMonthly,
    overtimePayMonthly,
    totalMonthly,
    totalAnnual,
  };
}
