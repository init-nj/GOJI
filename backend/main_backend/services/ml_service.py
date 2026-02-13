"""
ML Service for Expense Categorization and Anomaly Detection
Uses simple NLP and statistical methods for classification
"""

import re
from typing import Tuple, Dict, List
from collections import defaultdict
import statistics


class MLService:
    """Machine Learning service for expense analysis"""
    
    # Enhanced category keywords with weights
    CATEGORY_PATTERNS = {
        'marketing': {
            'keywords': ['ad', 'ads', 'marketing', 'campaign', 'social media', 'facebook', 
                        'google ads', 'seo', 'sem', 'promotion', 'advertising', 'instagram',
                        'twitter', 'linkedin', 'sponsored', 'influencer', 'content'],
            'weight': 1.0
        },
        'software': {
            'keywords': ['aws', 'azure', 'gcp', 'software', 'saas', 'license', 'subscription',
                        'adobe', 'microsoft', 'slack', 'zoom', 'github', 'jira', 'confluence',
                        'notion', 'figma', 'canva', 'dropbox', 'api', 'hosting', 'domain'],
            'weight': 1.0
        },
        'travel': {
            'keywords': ['flight', 'hotel', 'uber', 'lyft', 'airbnb', 'travel', 'taxi',
                        'rental car', 'airline', 'booking', 'accommodation', 'trip',
                        'expedia', 'airfare', 'train', 'bus', 'transportation'],
            'weight': 1.0
        },
        'office': {
            'keywords': ['rent', 'office', 'utilities', 'electricity', 'internet', 'supplies',
                        'furniture', 'desk', 'chair', 'stationery', 'printer', 'paper',
                        'building', 'lease', 'maintenance', 'cleaning', 'janitorial'],
            'weight': 1.0
        },
        'payroll': {
            'keywords': ['salary', 'wage', 'payroll', 'bonus', 'compensation', 'benefits',
                        'insurance', 'health', 'dental', '401k', 'pension', 'contractor',
                        'freelancer', 'stipend', 'reimbursement'],
            'weight': 1.2  # Higher weight for important category
        },
        'food': {
            'keywords': ['restaurant', 'food', 'meal', 'lunch', 'dinner', 'catering',
                        'snacks', 'coffee', 'cafe', 'breakfast', 'delivery', 'doordash',
                        'ubereats', 'grubhub', 'starbucks', 'dining'],
            'weight': 0.8
        },
        'equipment': {
            'keywords': ['computer', 'laptop', 'monitor', 'hardware', 'equipment', 'printer',
                        'server', 'mouse', 'keyboard', 'headphones', 'webcam', 'phone',
                        'tablet', 'ipad', 'macbook', 'dell', 'hp', 'lenovo'],
            'weight': 1.0
        },
        'legal': {
            'keywords': ['legal', 'lawyer', 'attorney', 'compliance', 'registration',
                        'trademark', 'patent', 'incorporation', 'contract', 'law firm',
                        'notary', 'filing', 'court', 'litigation'],
            'weight': 1.0
        },
        'consulting': {
            'keywords': ['consultant', 'consulting', 'advisor', 'advisory', 'coaching',
                        'training', 'workshop', 'seminar', 'professional services'],
            'weight': 0.9
        },
        'other': {
            'keywords': [],
            'weight': 0.5
        }
    }
    
    def categorize_expense(
        self,
        title: str,
        description: str = "",
        vendor: str = "",
        amount: float = 0.0
    ) -> Tuple[str, float]:
        """
        Categorize expense using NLP keyword matching
        
        Args:
            title: Expense title
            description: Optional description
            vendor: Optional vendor name
            amount: Expense amount (can influence categorization)
            
        Returns:
            Tuple of (category, confidence_score)
        """
        # Combine all text and normalize
        text = f"{title} {description} {vendor}".lower()
        text = re.sub(r'[^\w\s]', ' ', text)  # Remove punctuation
        
        scores = defaultdict(float)
        
        # Score each category
        for category, config in self.CATEGORY_PATTERNS.items():
            category_score = 0
            keywords = config['keywords']
            weight = config['weight']
            
            for keyword in keywords:
                # Exact match gets higher score
                if keyword in text:
                    # Multi-word keywords get bonus
                    if ' ' in keyword:
                        category_score += 2.0
                    else:
                        category_score += 1.0
                
                # Partial match gets lower score
                keyword_words = keyword.split()
                if len(keyword_words) > 1:
                    matches = sum(1 for word in keyword_words if word in text)
                    if matches > 0:
                        category_score += 0.5 * (matches / len(keyword_words))
            
            # Apply category weight
            scores[category] = category_score * weight
        
        # Amount-based adjustments
        if amount > 0:
            if amount > 5000:
                scores['equipment'] *= 1.2  # Large amounts likely equipment
                scores['payroll'] *= 1.3    # Or payroll
            elif amount < 50:
                scores['food'] *= 1.3       # Small amounts likely food
                scores['office'] *= 1.2     # Or office supplies
        
        # Get best category
        if all(score == 0 for score in scores.values()):
            return 'other', 0.3
        
        best_category = max(scores.items(), key=lambda x: x[1])
        category_name = best_category[0]
        raw_score = best_category[1]
        
        # Convert score to confidence (0.0 to 1.0)
        # Normalize based on max possible score
        max_possible = len(self.CATEGORY_PATTERNS[category_name]['keywords']) * 2.0
        if max_possible > 0:
            confidence = min(raw_score / max_possible, 1.0)
        else:
            confidence = 0.5
        
        # Boost confidence if score is clearly higher than others
        second_best = sorted(scores.values(), reverse=True)[1] if len(scores) > 1 else 0
        if raw_score > second_best * 2:
            confidence = min(confidence * 1.2, 0.95)
        
        # Ensure minimum confidence
        confidence = max(confidence, 0.35)
        
        return category_name, round(confidence, 2)
    
    def detect_anomaly(
        self,
        amount: float,
        category: str,
        historical_data: List[float],
        budget_limit: float = None
    ) -> Tuple[bool, str]:
        """
        Detect if expense is anomalous
        
        Args:
            amount: Expense amount
            category: Expense category
            historical_data: List of historical amounts for this category
            budget_limit: Optional budget limit for category
            
        Returns:
            Tuple of (is_anomaly, reason)
        """
        reasons = []
        
        # Check 1: Compare to historical average
        if historical_data and len(historical_data) >= 3:
            avg = statistics.mean(historical_data)
            std_dev = statistics.stdev(historical_data) if len(historical_data) > 1 else 0
            
            # Z-score approach
            if std_dev > 0:
                z_score = (amount - avg) / std_dev
                if abs(z_score) > 3:  # 3 standard deviations
                    reasons.append(
                        f"Amount ${amount:,.2f} is {abs(z_score):.1f} std deviations "
                        f"from average ${avg:,.2f}"
                    )
            
            # Simple threshold approach
            if amount > avg * 3:
                reasons.append(
                    f"Amount ${amount:,.2f} is 3x higher than category average ${avg:,.2f}"
                )
        
        # Check 2: Compare to budget
        if budget_limit and amount > budget_limit * 0.5:
            reasons.append(
                f"Single expense ${amount:,.2f} exceeds 50% of budget limit ${budget_limit:,.2f}"
            )
        
        # Check 3: Unusual amounts (round numbers, very specific amounts)
        if amount >= 10000 and amount % 1000 == 0:
            reasons.append(f"Unusually round large amount: ${amount:,.2f}")
        
        # Check 4: Category-specific rules
        category_limits = {
            'food': 500,        # Food over $500 is unusual
            'office': 2000,     # Office supplies over $2000
            'travel': 5000,     # Travel over $5000
        }
        
        if category in category_limits and amount > category_limits[category]:
            reasons.append(
                f"Amount ${amount:,.2f} exceeds typical {category} expense "
                f"threshold ${category_limits[category]:,.2f}"
            )
        
        is_anomaly = len(reasons) > 0
        reason = "; ".join(reasons) if reasons else None
        
        return is_anomaly, reason
    
    def suggest_vendors(self, category: str) -> List[str]:
        """
        Suggest common vendors for a category
        
        Args:
            category: Expense category
            
        Returns:
            List of suggested vendor names
        """
        vendor_suggestions = {
            'marketing': ['Google Ads', 'Facebook Ads', 'LinkedIn', 'HubSpot', 'Mailchimp'],
            'software': ['AWS', 'Microsoft Azure', 'GitHub', 'Slack', 'Zoom', 'Notion'],
            'travel': ['Delta', 'United', 'Marriott', 'Hilton', 'Uber', 'Lyft'],
            'office': ['Staples', 'Office Depot', 'Amazon Business', 'IKEA'],
            'food': ['Starbucks', 'Panera', 'Chipotle', 'DoorDash', 'Uber Eats'],
            'equipment': ['Apple', 'Dell', 'HP', 'Lenovo', 'Best Buy', 'Amazon'],
            'legal': ['LegalZoom', 'Rocket Lawyer'],
        }
        
        return vendor_suggestions.get(category, [])
    
    def extract_keywords(self, text: str, top_n: int = 5) -> List[str]:
        """
        Extract important keywords from expense text
        
        Args:
            text: Expense description text
            top_n: Number of keywords to return
            
        Returns:
            List of important keywords
        """
        # Normalize text
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)
        
        # Remove common stop words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
                     'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been'}
        
        words = text.split()
        keywords = [w for w in words if w not in stop_words and len(w) > 3]
        
        # Count frequency
        word_freq = defaultdict(int)
        for word in keywords:
            word_freq[word] += 1
        
        # Get top N
        top_keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:top_n]
        
        return [word for word, count in top_keywords]


# Singleton instance
ml_service = MLService()


def categorize_expense(title: str, description: str = "", vendor: str = "", 
                      amount: float = 0.0) -> Tuple[str, float]:
    """
    Convenience function to categorize expense
    
    Usage:
        category, confidence = categorize_expense(
            "AWS Invoice",
            "Cloud hosting services",
            "Amazon Web Services"
        )
    """
    return ml_service.categorize_expense(title, description, vendor, amount)


def detect_anomaly(amount: float, category: str, historical_data: List[float],
                   budget_limit: float = None) -> Tuple[bool, str]:
    """
    Convenience function to detect anomalies
    
    Usage:
        is_anomaly, reason = detect_anomaly(
            15000, 
            "marketing",
            [2000, 2500, 2200, 2800],
            budget_limit=5000
        )
    """
    return ml_service.detect_anomaly(amount, category, historical_data, budget_limit)