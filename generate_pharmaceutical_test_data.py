#!/usr/bin/env python3
"""
Pharmaceutical Test Data Generator
Generates realistic GTIN, serial numbers, lot numbers, and expiration dates
based on real NDC numbers for testing pharmaceutical systems.
"""

import random
import string
import json
from datetime import datetime, timedelta
from typing import List, Dict

class PharmaceuticalDataGenerator:
    def __init__(self):
        self.current_year = 2026
        self.batch_letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
        
    def ndc_to_gtin14(self, ndc: str) -> str:
        """
        Convert NDC to GTIN-14 format
        NDC format: 5-4-2 or 4-4-2 becomes GTIN-14: 00 + normalized NDC + check digit
        """
        # Remove hyphens and normalize to 11 digits
        ndc_clean = ndc.replace('-', '')
        
        # Pad to 11 digits if needed (some NDCs are shorter)
        if len(ndc_clean) < 11:
            ndc_clean = ndc_clean.zfill(11)
        elif len(ndc_clean) > 11:
            ndc_clean = ndc_clean[:11]
        
        # Add company prefix (00) + indicator (3) to make 14 digits total
        gtin_without_check = f"003{ndc_clean}"
        
        # Calculate check digit using GS1 algorithm
        check_digit = self.calculate_gtin_check_digit(gtin_without_check)
        
        return f"{gtin_without_check}{check_digit}"
    
    def calculate_gtin_check_digit(self, partial_gtin: str) -> str:
        """Calculate GTIN check digit using GS1 algorithm"""
        total = 0
        for i, digit in enumerate(reversed(partial_gtin)):
            multiplier = 3 if i % 2 == 0 else 1
            total += int(digit) * multiplier
        
        check_digit = (10 - (total % 10)) % 10
        return str(check_digit)
    
    def generate_serial_number(self) -> str:
        """Generate realistic serial number (up to 20 alphanumeric chars)"""
        # Format: SN + YYMMDD + random 8-digit number + random 2 letters
        date_part = datetime.now().strftime("%y%m%d")
        number_part = ''.join(random.choices(string.digits, k=8))
        letter_part = ''.join(random.choices(string.ascii_uppercase, k=2))
        
        return f"SN{date_part}{number_part}{letter_part}"
    
    def generate_lot_number(self) -> str:
        """Generate realistic lot number (up to 20 alphanumeric chars)"""
        # Format: LOT + YYYY + batch letter + 3-digit batch number
        year = self.current_year
        batch_letter = random.choice(self.batch_letters)
        batch_number = str(random.randint(1, 999)).zfill(3)
        
        return f"LOT{year}{batch_letter}{batch_number}"
    
    def generate_expiration_date(self) -> str:
        """Generate realistic expiration date in YYMMDD format (1-3 years from now)"""
        # Random expiration between 12 and 36 months from now
        months_ahead = random.randint(12, 36)
        exp_date = datetime.now() + timedelta(days=months_ahead * 30)
        
        return exp_date.strftime("%y%m%d")
    
    def generate_gs1_datamatrix_content(self, gtin: str, serial: str, 
                                      lot: str, exp_date: str) -> str:
        """Generate GS1 DataMatrix content with Application Identifiers"""
        return f"(01){gtin}(21){serial}(17){exp_date}(10){lot}"
    
    def generate_test_data(self, ndc_list: List[str]) -> List[Dict]:
        """Generate complete test data for a list of NDC numbers"""
        test_data = []
        
        for ndc in ndc_list:
            # Generate all required elements
            gtin = self.ndc_to_gtin14(ndc)
            serial = self.generate_serial_number()
            lot = self.generate_lot_number()
            exp_date = self.generate_expiration_date()
            gs1_content = self.generate_gs1_datamatrix_content(gtin, serial, lot, exp_date)
            
            # Create data record
            record = {
                "ndc": ndc,
                "gtin_14": gtin,
                "serial_number": serial,
                "lot_number": lot,
                "expiration_date": exp_date,
                "expiration_readable": datetime.strptime(f"20{exp_date}", "%Y%m%d").strftime("%m/%d/%Y"),
                "gs1_datamatrix_content": gs1_content,
                "generated_timestamp": datetime.now().isoformat()
            }
            
            test_data.append(record)
        
        return test_data
    
    def save_to_json(self, data: List[Dict], filename: str = "pharmaceutical_test_data.json"):
        """Save test data to JSON file"""
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"Test data saved to {filename}")
    
    def save_to_csv(self, data: List[Dict], filename: str = "pharmaceutical_test_data.csv"):
        """Save test data to CSV file"""
        import csv
        
        if not data:
            return
        
        fieldnames = data[0].keys()
        
        with open(filename, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(data)
        
        print(f"Test data saved to {filename}")


def main():
    """Main function to generate test data"""
    generator = PharmaceuticalDataGenerator()
    
    # Example NDC numbers - replace with your actual NDCs
    sample_ndc_list = [
        "0069-2587-68",  # Lipitor 20mg
        "0781-1506-10",  # Acetaminophen 325mg
        "0904-5739-61",  # Ibuprofen 200mg
        "0071-0155-23",  # Advil 200mg
        "0363-0181-01",  # Aspirin 325mg
        "49348-0593-34", # Metformin 500mg
        "0093-0058-01",  # Lisinopril 10mg
        "0172-4368-70",  # Atorvastatin 20mg
        "65162-0406-10", # Omeprazole 20mg
        "43063-0196-30", # Simvastatin 20mg
        "0378-0221-01",  # Hydrochlorothiazide 25mg
        "0591-0405-01",  # Losartan 50mg
        "0093-0127-01",  # Metoprolol 50mg
        "43063-0011-30", # Amlodipine 5mg
        "0378-0827-91",  # Prednisone 20mg
        "0093-2748-01",  # Furosemide 40mg
        "0172-4339-70",  # Rosuvastatin 10mg
        "65862-0196-90", # Pantoprazole 40mg
        "43063-0239-30", # Sertraline 50mg
        "0378-1805-01"   # Tramadol 50mg
    ]
    
    print("🔬 Pharmaceutical Test Data Generator")
    print("=" * 50)
    print(f"Generating test data for {len(sample_ndc_list)} NDC numbers...")
    
    # Generate test data
    test_data = generator.generate_test_data(sample_ndc_list)
    
    # Save to files
    generator.save_to_json(test_data)
    generator.save_to_csv(test_data)
    
    # Display sample data
    print(f"\n📋 Sample Generated Data:")
    print("-" * 50)
    for i, record in enumerate(test_data[:3]):
        print(f"\nRecord {i+1}:")
        print(f"  NDC: {record['ndc']}")
        print(f"  GTIN-14: {record['gtin_14']}")
        print(f"  Serial: {record['serial_number']}")
        print(f"  Lot: {record['lot_number']}")
        print(f"  Expires: {record['expiration_readable']}")
        print(f"  GS1 DataMatrix: {record['gs1_datamatrix_content']}")
    
    print(f"\n✅ Generated {len(test_data)} pharmaceutical test records")
    print("📁 Files created:")
    print("   - pharmaceutical_test_data.json")
    print("   - pharmaceutical_test_data.csv")
    
    print(f"\n💡 Usage Notes:")
    print("   - GTINs are calculated using GS1 standard from NDCs")
    print("   - Serial numbers follow realistic pharma patterns")
    print("   - Lot numbers use industry-standard format")
    print("   - Expiration dates are 1-3 years in the future")
    print("   - GS1 DataMatrix content ready for barcode generation")


if __name__ == "__main__":
    main()