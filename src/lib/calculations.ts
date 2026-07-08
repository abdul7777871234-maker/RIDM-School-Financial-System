export function calculateDueDateFee(student: any): number {
  if (!student.paymentPlan || student.paymentPlan === 'Full Payment') {
    return 0;
  }
  
  const daysElapsed = Math.max(0, (Date.now() - student.admissionDate) / (1000 * 60 * 60 * 24));

  switch (student.paymentPlan) {
    case 'Monthly':
      // 3-month billing cycles
      // Assuming 10 months total fee structure
      const monthlyFee = student.totalFee / 10;
      const cyclesElapsed = Math.floor(daysElapsed / 90);
      return (cyclesElapsed + 1) * (monthlyFee * 3);

    case 'Semester':
      // Generate due after current semester ends (approx 150 days)
      const semesterCycles = Math.floor(daysElapsed / 150);
      return (semesterCycles + 1) * (student.totalFee / 2);

    case 'Annual':
      // Before 12 months, fully paid.
      const annualCycles = Math.floor(daysElapsed / 365);
      return (annualCycles + 1) * student.totalFee;
       
    default:
      return student.totalFee;
  }
}

export function calculateTotalPaid(student: any): number {
  // Keeping the original totalPaid for historical accuracy, 
  // but for the current cycle logic, this might need more context.
  // The user said "Previous paid records must remain in payment history."
  // So totalPaid should be the sum of payments.
  return student.totalPaid || 0;
}

export function calculateOutstanding(student: any): number {
  const expected = student.totalFee || 0;
  const paid = calculateTotalPaid(student);
  
  // Outstanding is what is expected MINUS what has been paid.
  // If paid > expected, outstanding is 0.
  const outstanding = expected - paid;
  return Math.max(0, outstanding);
}

export function calculateRemainingBalance(totalFee: number, totalPaid: number): number {
  return Math.max(0, totalFee - totalPaid);
}
