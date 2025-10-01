#!/usr/bin/env python3
"""
Quick Format Check - See exactly what OCR format we get
"""

import cv2
from paddleocr import PaddleOCR
import os
import json

# Test the exact image path your admin interface uses
test_image = r"c:\Users\aramu\OneDrive\Desktop\Questions\test_image.png"

if os.path.exists(test_image):
    print(f"✅ Testing: {test_image}")
    print(f"📏 Size: {os.path.getsize(test_image)} bytes")
    
    # Load image
    img = cv2.imread(test_image)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Use the exact OCR settings from your system
    ocr = PaddleOCR(use_angle_cls=True, lang='en', det_db_thresh=0.2, det_db_box_thresh=0.3)
    results = ocr.ocr(img_rgb)
    
    print(f"\n📊 OCR Results Format Analysis:")
    print(f"results type: {type(results)}")
    print(f"results length: {len(results) if results else 0}")
    
    if results and results[0]:
        print(f"results[0] type: {type(results[0])}")
        print(f"results[0] length: {len(results[0])}")
        
        print(f"\n🔍 First 3 detections detailed format:")
        for i in range(min(3, len(results[0]))):
            detection = results[0][i]
            print(f"\nDetection {i}:")
            print(f"  Raw: {detection}")
            print(f"  Type: {type(detection)}")
            print(f"  Length: {len(detection) if hasattr(detection, '__len__') else 'No len'}")
            
            if detection and len(detection) >= 2:
                print(f"  detection[0] (bbox): {detection[0]} (type: {type(detection[0])})")
                print(f"  detection[1] (text_data): {detection[1]} (type: {type(detection[1])})")
                
                # Try different unpacking approaches
                try:
                    bbox, (text, conf) = detection
                    print(f"  ✅ Standard unpack: '{text}' (conf: {conf})")
                except:
                    try:
                        bbox, text_data = detection
                        if isinstance(text_data, (list, tuple)):
                            text, conf = text_data[0], text_data[1]
                            print(f"  ✅ Safe unpack: '{text}' (conf: {conf})")
                        else:
                            print(f"  ❌ text_data is not tuple: {text_data}")
                    except Exception as e:
                        print(f"  ❌ Both unpack methods failed: {e}")
    else:
        print("❌ No OCR results")
        
else:
    print("❌ Test image not found")
