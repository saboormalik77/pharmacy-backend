#!/usr/bin/env python3
"""
Custom NDC Test Data Generator
Simply replace the NDC list below with your own NDCs and run this script.
"""

from generate_pharmaceutical_test_data import PharmaceuticalDataGenerator

def generate_custom_test_data():
    """
    Replace the NDC_LIST below with your own 20 NDC numbers
    """
    
    # 🔥 REPLACE THIS LIST WITH YOUR OWN NDC NUMBERS 🔥
    NDC_LIST = [
        "0069-2587-68",  # Replace with your NDC #1
        "0781-1506-10",  # Replace with your NDC #2
        "0904-5739-61",  # Replace with your NDC #3
        "0071-0155-23",  # Replace with your NDC #4
        "0363-0181-01",  # Replace with your NDC #5
        "49348-0593-34", # Replace with your NDC #6
        "0093-0058-01",  # Replace with your NDC #7
        "0172-4368-70",  # Replace with your NDC #8
        "65162-0406-10", # Replace with your NDC #9
        "43063-0196-30", # Replace with your NDC #10
        "0378-0221-01",  # Replace with your NDC #11
        "0591-0405-01",  # Replace with your NDC #12
        "0093-0127-01",  # Replace with your NDC #13
        "43063-0011-30", # Replace with your NDC #14
        "0378-0827-91",  # Replace with your NDC #15
        "0093-2748-01",  # Replace with your NDC #16
        "0172-4339-70",  # Replace with your NDC #17
        "65862-0196-90", # Replace with your NDC #18
        "43063-0239-30", # Replace with your NDC #19
        "0378-1805-01"   # Replace with your NDC #20
    ]
    
    print("🎯 Custom NDC Test Data Generator")
    print("=" * 50)
    print(f"Processing {len(NDC_LIST)} NDC numbers...")
    
    # Initialize generator
    generator = PharmaceuticalDataGenerator()
    
    # Generate test data
    test_data = generator.generate_test_data(NDC_LIST)
    
    # Save files with custom prefix
    generator.save_to_json(test_data, "my_custom_pharmaceutical_test_data.json")
    generator.save_to_csv(test_data, "my_custom_pharmaceutical_test_data.csv")
    
    # Display all generated data
    print(f"\n📋 All Generated Test Data:")
    print("-" * 80)
    
    for i, record in enumerate(test_data):
        print(f"\n🏥 Drug #{i+1}:")
        print(f"   NDC: {record['ndc']}")
        print(f"   GTIN-14: {record['gtin_14']}")
        print(f"   Serial: {record['serial_number']}")
        print(f"   Lot: {record['lot_number']}")
        print(f"   Expires: {record['expiration_readable']} (YYMMDD: {record['expiration_date']})")
        print(f"   📱 QR Content: {record['gs1_datamatrix_content']}")
    
    print(f"\n✅ Success! Generated {len(test_data)} complete pharmaceutical test records")
    print("\n📁 Output Files:")
    print("   📄 my_custom_pharmaceutical_test_data.json")
    print("   📄 my_custom_pharmaceutical_test_data.csv")
    
    print(f"\n🔍 What Each Field Means:")
    print("   • NDC: Your real drug identifier")  
    print("   • GTIN-14: Calculated using GS1 standard (scannable)")
    print("   • Serial: Unique package identifier (SN + date + random)")
    print("   • Lot: Manufacturing batch (LOT + year + batch code)")
    print("   • Expiration: Random date 1-3 years in future")
    print("   • QR Content: Complete GS1 DataMatrix string for barcode generation")
    
    print(f"\n💡 Usage Instructions:")
    print("   1. Use the 'QR Content' field to generate DataMatrix barcodes")
    print("   2. Test your scanner with these barcodes")
    print("   3. Your system should parse the (01), (21), (17), (10) identifiers")
    print("   4. The NDCs are real, so lookups should work properly")

if __name__ == "__main__":
    generate_custom_test_data()