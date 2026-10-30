import { RiskCalculationInput, RiskCalculationResult, RiskLimits } from '../types/trading';

export const DEFAULT_RISK_LIMITS: RiskLimits = {
  maxRiskPerTradePercent: 2.0,      // Max 2% capital risk per trade
  maxDailyLossAmount: 500.0,        // Max $500 daily loss
  maxDrawdownPercent: 10.0,         // Max 10% peak-to-trough drawdown
  maxPortfolioExposurePercent: 80.0,// Max 80% capital allocated
  maxAssetConcentrationPercent: 30.0// Max 30% in one asset
};

/**
 * Calculates position size, monetary risk, reward-to-risk ratio,
 * and validates trade inputs against institutional risk parameters.
 */
export function calculateRisk(
  input: RiskCalculationInput,
  limits: RiskLimits = DEFAULT_RISK_LIMITS
): RiskCalculationResult {
  const {
    accountBalance,
    riskPercentage,
    entryPrice,
    stopLossPrice,
    takeProfitPrice,
    side,
    feePercent = 0.075,
    slippagePercent = 0.05,
  } = input;

  const warnings: string[] = [];

  if (accountBalance <= 0) {
    return {
      monetaryRisk: 0,
      positionSize: 0,
      totalExposure: 0,
      exposurePercent: 0,
      potentialProfit: 0,
      potentialLoss: 0,
      riskToRewardRatio: 0,
      estimatedFee: 0,
      estimatedSlippage: 0,
      isRiskExceeded: true,
      warnings: ['Account balance must be greater than zero.'],
    };
  }

  if (entryPrice <= 0 || stopLossPrice <= 0) {
    return {
      monetaryRisk: 0,
      positionSize: 0,
      totalExposure: 0,
      exposurePercent: 0,
      potentialProfit: 0,
      potentialLoss: 0,
      riskToRewardRatio: 0,
      estimatedFee: 0,
      estimatedSlippage: 0,
      isRiskExceeded: true,
      warnings: ['Entry price and stop-loss price must be positive numbers.'],
    };
  }

  // Validate stop-loss direction
  if (side === 'BUY' && stopLossPrice >= entryPrice) {
    warnings.push('For a Long (BUY) order, the stop-loss must be strictly below the entry price.');
  }
  if (side === 'SELL' && stopLossPrice <= entryPrice) {
    warnings.push('For a Short (SELL) order, the stop-loss must be strictly above the entry price.');
  }

  // Monetary Risk: $ capital we are willing to lose on this trade
  const monetaryRisk = (accountBalance * riskPercentage) / 100;

  // Stop distance per unit
  const stopDistance = Math.abs(entryPrice - stopLossPrice);

  let positionSize = 0;
  if (stopDistance > 0) {
    positionSize = monetaryRisk / stopDistance;
  }

  // Calculate gross exposure
  const totalExposure = positionSize * entryPrice;
  const exposurePercent = accountBalance > 0 ? (totalExposure / accountBalance) * 100 : 0;

  // Potential profit if take-profit is specified
  let potentialProfit = 0;
  let riskToRewardRatio = 0;
  if (takeProfitPrice && takeProfitPrice > 0) {
    const profitDistance = Math.abs(takeProfitPrice - entryPrice);
    potentialProfit = positionSize * profitDistance;
    riskToRewardRatio = stopDistance > 0 ? Number((profitDistance / stopDistance).toFixed(2)) : 0;

    if (side === 'BUY' && takeProfitPrice <= entryPrice) {
      warnings.push('For a Long (BUY) order, the take-profit target must be above the entry price.');
    }
    if (side === 'SELL' && takeProfitPrice >= entryPrice) {
      warnings.push('For a Short (SELL) order, the take-profit target must be below the entry price.');
    }
  }

  const potentialLoss = monetaryRisk;

  // Transaction costs
  const totalRate = (feePercent + slippagePercent) / 100;
  const estimatedFee = (totalExposure * feePercent) / 100;
  const estimatedSlippage = (totalExposure * slippagePercent) / 100;

  // Check institutional limits
  let isRiskExceeded = false;
  if (riskPercentage > limits.maxRiskPerTradePercent) {
    isRiskExceeded = true;
    warnings.push(
      `Risk per trade (${riskPercentage.toFixed(1)}%) exceeds maximum risk limit of ${limits.maxRiskPerTradePercent.toFixed(1)}%.`
    );
  }

  if (exposurePercent > limits.maxPortfolioExposurePercent) {
    isRiskExceeded = true;
    warnings.push(
      `Position exposure (${exposurePercent.toFixed(1)}%) exceeds maximum portfolio allocation limit of ${limits.maxPortfolioExposurePercent.toFixed(1)}%.`
    );
  }

  if (riskToRewardRatio > 0 && riskToRewardRatio < 1.0) {
    warnings.push(`Risk-to-reward ratio (${riskToRewardRatio}:1) is negative expectancy (< 1.0). Target at least 1.5:1.`);
  }

  return {
    monetaryRisk: Number(monetaryRisk.toFixed(2)),
    positionSize: Number(positionSize.toFixed(4)),
    totalExposure: Number(totalExposure.toFixed(2)),
    exposurePercent: Number(exposurePercent.toFixed(2)),
    potentialProfit: Number(potentialProfit.toFixed(2)),
    potentialLoss: Number(potentialLoss.toFixed(2)),
    riskToRewardRatio,
    estimatedFee: Number(estimatedFee.toFixed(2)),
    estimatedSlippage: Number(estimatedSlippage.toFixed(2)),
    isRiskExceeded,
    warnings,
  };
}
