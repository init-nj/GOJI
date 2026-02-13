"""
Prediction Service for Financial Forecasting
Implements simple ML models for cash flow, burn rate, and budget predictions
"""

import statistics
from typing import List, Dict, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass


@dataclass
class Prediction:
    """Data class for prediction results"""
    value: float
    confidence: float  # 0.0 to 1.0
    lower_bound: float
    upper_bound: float


class PredictionService:
    """Service for financial predictions and forecasting"""
    
    def predict_cash_flow(
        self,
        historical_expenses: List[float],
        historical_revenue: List[float],
        months_ahead: int = 3
    ) -> List[Dict]:
        """
        Predict cash flow for next N months using linear regression
        
        Args:
            historical_expenses: List of monthly expenses (chronological)
            historical_revenue: List of monthly revenue (chronological)
            months_ahead: Number of months to predict
            
        Returns:
            List of predictions with month, revenue, expense, cash_flow
        """
        predictions = []
        
        # Need at least 3 months of data
        if len(historical_expenses) < 3 or len(historical_revenue) < 3:
            # Use simple average if insufficient data
            avg_expense = statistics.mean(historical_expenses) if historical_expenses else 0
            avg_revenue = statistics.mean(historical_revenue) if historical_revenue else 0
            
            for i in range(1, months_ahead + 1):
                target_date = datetime.now() + timedelta(days=30 * i)
                predictions.append({
                    "month": target_date.month,
                    "year": target_date.year,
                    "predicted_expense": round(avg_expense, 2),
                    "predicted_revenue": round(avg_revenue, 2),
                    "predicted_cash_flow": round(avg_revenue - avg_expense, 2),
                    "confidence": 0.4  # Low confidence
                })
            
            return predictions
        
        # Calculate trends using simple linear regression
        expense_trend = self._calculate_trend(historical_expenses)
        revenue_trend = self._calculate_trend(historical_revenue)
        
        # Get recent averages (last 3 months weighted more)
        expense_base = statistics.mean(historical_expenses[-3:])
        revenue_base = statistics.mean(historical_revenue[-3:])
        
        # Generate predictions
        for i in range(1, months_ahead + 1):
            predicted_expense = expense_base + (expense_trend * i)
            predicted_revenue = revenue_base + (revenue_trend * i)
            
            # Ensure non-negative
            predicted_expense = max(0, predicted_expense)
            predicted_revenue = max(0, predicted_revenue)
            
            target_date = datetime.now() + timedelta(days=30 * i)
            
            # Calculate confidence based on data consistency
            confidence = self._calculate_confidence(
                historical_expenses + historical_revenue,
                len(historical_expenses)
            )
            
            predictions.append({
                "month": target_date.month,
                "year": target_date.year,
                "predicted_expense": round(predicted_expense, 2),
                "predicted_revenue": round(predicted_revenue, 2),
                "predicted_cash_flow": round(predicted_revenue - predicted_expense, 2),
                "confidence": round(confidence, 2)
            })
        
        return predictions
    
    def predict_burn_rate(
        self,
        historical_expenses: List[float],
        current_budget: float
    ) -> Dict:
        """
        Calculate burn rate and predict runway
        
        Args:
            historical_expenses: List of monthly expenses
            current_budget: Total remaining budget
            
        Returns:
            Dict with burn_rate, runway_months, depletion_date
        """
        if not historical_expenses:
            return {
                "burn_rate": 0,
                "runway_months": None,
                "depletion_date": None,
                "confidence": 0.0
            }
        
        # Calculate average burn rate (weighted toward recent months)
        if len(historical_expenses) >= 3:
            # Weight: last month = 50%, previous 2 months = 50%
            burn_rate = (historical_expenses[-1] * 0.5 + 
                        statistics.mean(historical_expenses[-3:-1]) * 0.5)
        else:
            burn_rate = statistics.mean(historical_expenses)
        
        # Calculate runway
        if burn_rate > 0:
            runway_months = current_budget / burn_rate
            depletion_date = datetime.now() + timedelta(days=30 * runway_months)
        else:
            runway_months = None
            depletion_date = None
        
        # Calculate confidence
        confidence = self._calculate_confidence(historical_expenses, len(historical_expenses))
        
        return {
            "burn_rate": round(burn_rate, 2),
            "runway_months": round(runway_months, 1) if runway_months else None,
            "depletion_date": depletion_date.strftime('%Y-%m-%d') if depletion_date else None,
            "confidence": round(confidence, 2)
        }
    
    def predict_budget_overrun(
        self,
        current_spending: float,
        budget_limit: float,
        days_elapsed: int,
        days_in_month: int = 30
    ) -> Dict:
        """
        Predict if budget will be exceeded this month
        
        Args:
            current_spending: Amount spent so far this month
            budget_limit: Monthly budget limit
            days_elapsed: Days elapsed in current month
            days_in_month: Total days in month
            
        Returns:
            Dict with predicted_total, overrun_amount, probability
        """
        if days_elapsed == 0:
            return {
                "predicted_total": 0,
                "overrun_amount": 0,
                "probability": 0.0,
                "days_remaining": days_in_month
            }
        
        # Calculate daily burn rate
        daily_rate = current_spending / days_elapsed
        
        # Predict end-of-month total
        predicted_total = daily_rate * days_in_month
        
        # Calculate overrun
        overrun_amount = max(0, predicted_total - budget_limit)
        
        # Calculate probability of overrun
        if predicted_total > budget_limit:
            # Higher certainty if we're far into the month
            time_factor = days_elapsed / days_in_month
            probability = min(0.5 + (time_factor * 0.5), 0.95)
        else:
            probability = 0.0
        
        return {
            "predicted_total": round(predicted_total, 2),
            "overrun_amount": round(overrun_amount, 2),
            "probability": round(probability, 2),
            "days_remaining": days_in_month - days_elapsed
        }
    
    def predict_category_spending(
        self,
        historical_by_category: Dict[str, List[float]],
        months_ahead: int = 1
    ) -> Dict[str, Prediction]:
        """
        Predict spending by category
        
        Args:
            historical_by_category: Dict mapping category to list of monthly amounts
            months_ahead: Number of months to predict
            
        Returns:
            Dict mapping category to Prediction object
        """
        predictions = {}
        
        for category, amounts in historical_by_category.items():
            if not amounts:
                continue
            
            # Calculate trend
            trend = self._calculate_trend(amounts)
            base = statistics.mean(amounts[-3:]) if len(amounts) >= 3 else statistics.mean(amounts)
            
            # Predict future value
            predicted_value = base + (trend * months_ahead)
            predicted_value = max(0, predicted_value)
            
            # Calculate bounds (±20% for simplicity)
            std_dev = statistics.stdev(amounts) if len(amounts) > 1 else base * 0.2
            lower_bound = max(0, predicted_value - std_dev)
            upper_bound = predicted_value + std_dev
            
            # Calculate confidence
            confidence = self._calculate_confidence(amounts, len(amounts))
            
            predictions[category] = Prediction(
                value=round(predicted_value, 2),
                confidence=round(confidence, 2),
                lower_bound=round(lower_bound, 2),
                upper_bound=round(upper_bound, 2)
            )
        
        return predictions
    
    def _calculate_trend(self, data: List[float]) -> float:
        """
        Calculate linear trend using simple linear regression
        
        Args:
            data: Time series data
            
        Returns:
            Slope (trend) value
        """
        if len(data) < 2:
            return 0.0
        
        n = len(data)
        x = list(range(n))
        y = data
        
        # Calculate means
        x_mean = statistics.mean(x)
        y_mean = statistics.mean(y)
        
        # Calculate slope
        numerator = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
        
        if denominator == 0:
            return 0.0
        
        slope = numerator / denominator
        return slope
    
    def _calculate_confidence(self, data: List[float], sample_size: int) -> float:
        """
        Calculate confidence score based on data quality
        
        Args:
            data: Historical data
            sample_size: Number of data points
            
        Returns:
            Confidence score (0.0 to 1.0)
        """
        base_confidence = 0.3
        
        # More data = higher confidence
        if sample_size >= 12:
            base_confidence += 0.4
        elif sample_size >= 6:
            base_confidence += 0.3
        elif sample_size >= 3:
            base_confidence += 0.2
        
        # Consistent data = higher confidence
        if len(data) > 1:
            std_dev = statistics.stdev(data)
            mean = statistics.mean(data)
            
            if mean > 0:
                coefficient_of_variation = std_dev / mean
                
                # Lower CV = more consistent = higher confidence
                if coefficient_of_variation < 0.2:
                    base_confidence += 0.2
                elif coefficient_of_variation < 0.5:
                    base_confidence += 0.1
        
        return min(base_confidence, 0.95)
    
    def generate_forecast_report(
        self,
        historical_expenses: List[float],
        historical_revenue: List[float],
        current_budget: float,
        months_ahead: int = 3
    ) -> Dict:
        """
        Generate comprehensive forecast report
        
        Args:
            historical_expenses: Monthly expenses
            historical_revenue: Monthly revenue
            current_budget: Total budget
            months_ahead: Months to forecast
            
        Returns:
            Comprehensive forecast dict
        """
        cash_flow_predictions = self.predict_cash_flow(
            historical_expenses,
            historical_revenue,
            months_ahead
        )
        
        burn_rate_info = self.predict_burn_rate(
            historical_expenses,
            current_budget
        )
        
        # Calculate summary statistics
        if cash_flow_predictions:
            avg_predicted_flow = statistics.mean(
                p['predicted_cash_flow'] for p in cash_flow_predictions
            )
            
            positive_months = sum(
                1 for p in cash_flow_predictions if p['predicted_cash_flow'] > 0
            )
        else:
            avg_predicted_flow = 0
            positive_months = 0
        
        return {
            "cash_flow_predictions": cash_flow_predictions,
            "burn_rate": burn_rate_info,
            "summary": {
                "average_predicted_cash_flow": round(avg_predicted_flow, 2),
                "positive_cash_flow_months": positive_months,
                "total_months_forecast": months_ahead,
                "outlook": "positive" if avg_predicted_flow > 0 else "negative"
            }
        }


# Singleton instance
prediction_service = PredictionService()


def predict_cash_flow(historical_expenses: List[float], historical_revenue: List[float],
                     months_ahead: int = 3) -> List[Dict]:
    """
    Convenience function for cash flow prediction
    
    Usage:
        predictions = predict_cash_flow(
            [10000, 12000, 11000],
            [25000, 28000, 26000],
            months_ahead=3
        )
    """
    return prediction_service.predict_cash_flow(
        historical_expenses, historical_revenue, months_ahead
    )


def predict_burn_rate(historical_expenses: List[float], current_budget: float) -> Dict:
    """
    Convenience function for burn rate prediction
    
    Usage:
        burn_info = predict_burn_rate([10000, 12000, 11000], 200000)
    """
    return prediction_service.predict_burn_rate(historical_expenses, current_budget)