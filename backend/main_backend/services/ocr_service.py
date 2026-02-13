"""
OCR Service for Receipt Scanning
Uses pytesseract for text extraction from images
"""

import re
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional
from PIL import Image
import pytesseract

class OCRService:
    """Service for extracting data from receipt images"""
    
    def __init__(self):
        # Set tesseract path if needed (Windows)
        # pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        pass
    
    def extract_receipt_data(self, image_path: str) -> Dict:
        """
        Extract structured data from receipt image
        
        Args:
            image_path: Path to receipt image file
            
        Returns:
            Dictionary with extracted data: vendor, amount, date, etc.
        """
        try:
            # Open image
            image = Image.open(image_path)
            
            # Perform OCR
            text = pytesseract.image_to_string(image)
            
            # Extract structured data
            result = {
                "raw_text": text,
                "vendor_name": self._extract_vendor(text),
                "amount": self._extract_amount(text),
                "date": self._extract_date(text),
                "confidence": self._calculate_confidence(text),
                "items": self._extract_items(text)
            }
            
            return result
            
        except Exception as e:
            return {
                "error": str(e),
                "raw_text": "",
                "vendor_name": None,
                "amount": None,
                "date": None,
                "confidence": 0.0
            }
    
    def _extract_vendor(self, text: str) -> Optional[str]:
        """Extract vendor name from OCR text"""
        # Vendor is usually in first few lines
        lines = text.strip().split('\n')
        
        # Skip very short lines
        for line in lines[:5]:
            line = line.strip()
            if len(line) > 3 and not any(char.isdigit() for char in line):
                # Clean up the vendor name
                vendor = re.sub(r'[^a-zA-Z0-9\s&\-]', '', line)
                if len(vendor) > 2:
                    return vendor.strip()
        
        return "Unknown Vendor"
    
    def _extract_amount(self, text: str) -> Optional[float]:
        """Extract total amount from OCR text"""
        # Look for patterns like:
        # Total: $123.45
        # TOTAL 123.45
        # Amount: 123.45
        
        patterns = [
            r'total[:\s]+\$?(\d+\.?\d*)',
            r'amount[:\s]+\$?(\d+\.?\d*)',
            r'sum[:\s]+\$?(\d+\.?\d*)',
            r'\$(\d+\.\d{2})',  # Generic dollar amount
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text.lower())
            if matches:
                # Get the largest amount (likely the total)
                amounts = [float(m) for m in matches]
                return max(amounts)
        
        return None
    
    def _extract_date(self, text: str) -> Optional[str]:
        """Extract date from OCR text"""
        # Common date patterns
        patterns = [
            r'(\d{1,2}/\d{1,2}/\d{2,4})',  # MM/DD/YYYY or DD/MM/YYYY
            r'(\d{1,2}-\d{1,2}-\d{2,4})',  # MM-DD-YYYY
            r'(\d{4}-\d{1,2}-\d{1,2})',    # YYYY-MM-DD
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                date_str = match.group(1)
                try:
                    # Try to parse and standardize
                    # This is simplified - you might need better date parsing
                    return date_str
                except:
                    continue
        
        # Default to today if not found
        return datetime.now().strftime('%Y-%m-%d')
    
    def _extract_items(self, text: str) -> list:
        """Extract line items from receipt"""
        items = []
        lines = text.split('\n')
        
        for line in lines:
            # Look for lines with both text and price
            # Pattern: Item Name ... $XX.XX
            match = re.search(r'(.+?)\s+\$?(\d+\.\d{2})', line)
            if match:
                item_name = match.group(1).strip()
                item_price = float(match.group(2))
                
                # Filter out total/subtotal lines
                if not any(word in item_name.lower() for word in ['total', 'subtotal', 'tax', 'amount']):
                    items.append({
                        "description": item_name,
                        "amount": item_price
                    })
        
        return items[:10]  # Limit to first 10 items
    
    def _calculate_confidence(self, text: str) -> float:
        """
        Calculate confidence score based on extracted data quality
        
        Returns score between 0.0 and 1.0
        """
        confidence = 0.5  # Base confidence
        
        # Check for key indicators
        if 'total' in text.lower():
            confidence += 0.15
        
        if re.search(r'\$?\d+\.\d{2}', text):
            confidence += 0.15
        
        if re.search(r'\d{1,2}/\d{1,2}/\d{2,4}', text):
            confidence += 0.1
        
        # Penalize if text is very short (likely poor OCR)
        if len(text) < 50:
            confidence -= 0.2
        
        # Penalize if too many special characters (OCR artifacts)
        special_chars = len(re.findall(r'[^a-zA-Z0-9\s\.\,\-\$\:]', text))
        if special_chars > len(text) * 0.2:
            confidence -= 0.15
        
        return max(0.0, min(1.0, confidence))
    
    def validate_receipt(self, image_path: str) -> bool:
        """
        Validate if image is a valid receipt
        
        Returns True if image appears to be a receipt
        """
        try:
            image = Image.open(image_path)
            
            # Check image size (receipts are usually vertical/portrait)
            width, height = image.size
            aspect_ratio = height / width
            
            # Receipts are typically taller than wide
            if aspect_ratio < 1.2:
                return False
            
            # Quick OCR to check for receipt keywords
            text = pytesseract.image_to_string(image).lower()
            
            receipt_keywords = ['total', 'receipt', 'amount', 'paid', 'tax', 'subtotal']
            matches = sum(1 for keyword in receipt_keywords if keyword in text)
            
            return matches >= 2
            
        except Exception:
            return False


# Singleton instance
ocr_service = OCRService()


def extract_receipt_data(image_path: str) -> Dict:
    """
    Convenience function to extract receipt data
    
    Usage:
        data = extract_receipt_data('/path/to/receipt.jpg')
    """
    return ocr_service.extract_receipt_data(image_path)


def validate_receipt_image(image_path: str) -> bool:
    """
    Convenience function to validate receipt
    
    Usage:
        is_valid = validate_receipt_image('/path/to/receipt.jpg')
    """
    return ocr_service.validate_receipt(image_path)