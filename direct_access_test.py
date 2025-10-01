#!/usr/bin/env python3
"""
Direct access to PaddleX OCRResult data
"""

import cv2
from paddleocr import PaddleOCR
import os

def direct_access_test():
    """Direct access to extract text from OCRResult"""
    
    image_path = r"c:\Users\aramu\OneDrive\Desktop\Questions\test_image.png"
    
    if not os.path.exists(image_path):
        print("❌ Image not found")
        return
    
    print("🎯 Direct PaddleX Access Test")
    print("=" * 30)
    
    # Load image
    img = cv2.imread(image_path)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Initialize OCR
    ocr = PaddleOCR(use_angle_cls=True, lang='en')
    results = ocr.ocr(img_rgb)
    
    if results and len(results) > 0:
        ocr_result = results[0]
        
        try:
            # Direct access using the keys we saw in the output
            texts = ocr_result['rec_texts']
            scores = ocr_result['rec_scores']
            
            print(f"✅ Found {len(texts)} texts and {len(scores)} scores")
            
            # Extract text
            extracted = []
            for i in range(min(len(texts), len(scores))):
                text = str(texts[i]).strip()
                conf = float(scores[i])
                
                print(f"Text {i+1}: '{text}' (confidence: {conf:.3f})")
                
                if len(text) >= 2 and conf >= 0.3:
                    extracted.append(text)
            
            # Combine results
            combined = " ".join(extracted)
            print(f"\n🎯 RESULTS:")
            print(f"Extracted {len(extracted)} valid texts")
            print(f"Total characters: {len(combined)}")
            print(f"Sample: {combined[:300]}...")
            
            if len(combined) > 50:
                print("\n🎉 SUCCESS! Text extraction working!")
                # Save sample to file for verification
                with open("extracted_sample.txt", "w", encoding="utf-8") as f:
                    f.write(combined)
                print("✅ Sample saved to extracted_sample.txt")
                return True
            else:
                print("\n⚠️ Limited text extracted")
                return False
                
        except Exception as e:
            print(f"❌ Direct access failed: {e}")
            
            # Try alternative access
            try:
                print("🔄 Trying alternative access...")
                for key in ['rec_texts', 'rec_scores', 'dt_polys']:
                    if key in ocr_result:
                        value = ocr_result[key]
                        print(f"  {key}: {type(value)} - {len(value) if hasattr(value, '__len__') else 'no len'}")
                        if key == 'rec_texts' and value:
                            print(f"    Sample texts: {value[:3]}")
            except Exception as alt_error:
                print(f"❌ Alternative access failed: {alt_error}")
            
            return False
    else:
        print("❌ No OCR results")
        return False

if __name__ == "__main__":
    success = direct_access_test()
    if success:
        print("\n✅ READY TO UPDATE EXTRACTOR!")
    else:
        print("\n❌ Need to debug further")
