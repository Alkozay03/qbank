#!/usr/bin/env python3
"""
PaddleX OCRResult Format Test
"""

import cv2
from paddleocr import PaddleOCR
import os

def test_paddlex_format():
    """Test PaddleX OCRResult object structure"""
    
    image_path = r"c:\Users\aramu\OneDrive\Desktop\Questions\test_image.png"
    
    if not os.path.exists(image_path):
        print("❌ Image not found")
        return
    
    print("🔬 PaddleX OCRResult Analysis")
    print("=" * 30)
    
    # Load image
    img = cv2.imread(image_path)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Initialize OCR
    ocr = PaddleOCR(use_angle_cls=True, lang='en')
    results = ocr.ocr(img_rgb)
    
    print(f"📊 results type: {type(results)}")
    print(f"📊 results length: {len(results) if results else 0}")
    
    if results and len(results) > 0:
        print(f"📊 results[0] type: {type(results[0])}")
        
        # Check if it's a PaddleX OCRResult object
        ocr_result = results[0]
        print(f"📊 OCRResult attributes: {dir(ocr_result) if hasattr(ocr_result, '__dict__') else 'No attributes'}")
        
        # Try different ways to access the data
        print("\n🔍 Trying different access methods:")
        
        # Method 1: Direct iteration
        try:
            print("Method 1: Direct iteration")
            for i, item in enumerate(ocr_result):
                print(f"  Item {i}: {item}")
                if i >= 2:
                    break
        except Exception as e:
            print(f"  ❌ Method 1 failed: {e}")
        
        # Method 2: Check for common attributes
        try:
            print("Method 2: Check attributes")
            if hasattr(ocr_result, 'boxes'):
                print(f"  ✅ Has boxes attribute: {len(ocr_result.boxes) if ocr_result.boxes else 0}")
            if hasattr(ocr_result, 'rec_text'):
                print(f"  ✅ Has rec_text attribute: {len(ocr_result.rec_text) if ocr_result.rec_text else 0}")
            if hasattr(ocr_result, 'rec_score'):
                print(f"  ✅ Has rec_score attribute: {len(ocr_result.rec_score) if ocr_result.rec_score else 0}")
            if hasattr(ocr_result, 'dt_polys'):
                print(f"  ✅ Has dt_polys attribute: {len(ocr_result.dt_polys) if ocr_result.dt_polys else 0}")
        except Exception as e:
            print(f"  ❌ Method 2 failed: {e}")
        
        # Method 3: Try as dict
        try:
            print("Method 3: Dict access")
            if hasattr(ocr_result, 'keys'):
                print(f"  ✅ Keys: {list(ocr_result.keys())}")
                for key in list(ocr_result.keys())[:3]:
                    print(f"  {key}: {ocr_result[key]}")
        except Exception as e:
            print(f"  ❌ Method 3 failed: {e}")
        
        # Method 4: Try __dict__
        try:
            print("Method 4: __dict__ access")
            if hasattr(ocr_result, '__dict__'):
                dict_items = ocr_result.__dict__
                print(f"  ✅ Dict keys: {list(dict_items.keys())}")
                for key, value in list(dict_items.items())[:3]:
                    print(f"  {key}: {type(value)} - {str(value)[:100]}...")
        except Exception as e:
            print(f"  ❌ Method 4 failed: {e}")
        
        # Method 5: String representation
        try:
            print("Method 5: String representation")
            str_repr = str(ocr_result)
            print(f"  String: {str_repr[:200]}...")
        except Exception as e:
            print(f"  ❌ Method 5 failed: {e}")

if __name__ == "__main__":
    test_paddlex_format()
