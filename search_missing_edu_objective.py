#!/usr/bin/env python3
"""
Search for missing educational objective text in all OCR blocks
"""

# The actual OCR blocks from the output
text_blocks = [
    "her from sleeping.",
    "She has no problems with her legs. The patient has chronic k",
    "hemodialysis",
    "On examination, she hasdiminished sensation in both hands ov",
    "radial half of the ring finger. Which of the following is th",
    "A. Endomysial inflammatory infiltration (12%)",
    "B. Endoneural arteriole hyalinization (11%)",
    "X",
    "C. Endoneural multifocal demyelination (11%)",
    "D.Mutations of a muscle structural protein gene (1%)",
    "Nerve compression within an anatomic compartment (63%)",
    "E.",
    "Incorrect",
    "03 mins, 16 secs",
    "63%",
    "Correct answer",
    "Time Spent",
    "Answered correctly",
    "E",
    "Explanation",
    "Carpal tunnel, palmar view",
    "Palmar digital",
    "branches",
    "of median nerve",
    "Transverse carpal",
    "ligament",
    "Trapezium",
    "(flexor retinaculum)",
    "Palmar cutaneous",
    "Pisiform",
    "branch of median nerve",
    "Carpal tunnel",
    "Median nerve",
    "Ulna",
    "Radius",
    "©UWorld",
    "Carpal tunnel syndrome (CTS) is a peripheral mononeuropathy",
    "between the carpal bones and transverse carpal ligament on t",
    "the digits pass through the carpal tunnel, and there is lttl",
    "CTS is associated with conditions that reduce carpal tunnel",
    "buildup), diabetes mellitus (connective tissue thickening),",
    "hemodialysis can develop median nerve compression through de",
    "tunnel.",
    "Symptoms and signs of CTS often occur bilaterally (in up to",
    "sensory impairment, pain, and/or paresthesias in the median",
    "fourth).Symptoms are usually worse at night.",
    "motor weakness during thumb abduction/opposition and thenar",
    "Tinel sign (tapping over the flexor surface of the wrist rep",
    "(Choice A) Endomysial inflammatory infiltration is found on",
    "weakness, not distal sensory symptoms as seen in this patien",
    "(Choice B) Endoneural arteriole hyalinization can occur in d",
    "symmetric peripheral polyneuropathy that usually starts in t",
    "distribution, which is more likely due to compressive neurop",
    "focal, not multifocal, demyelination.",
    "predominantly affects young boys and presents with proximal",
    "Educational objective:",
    "caused by median nerve compression at the transverse carpal",
    "References",
    "0",
    "Carpal tunnel syndrome: diagnosis and management.",
    "Nervous System",
    "Pathology",
    "Median nerve injury",
    "Subject",
    "System",
    "Topic",
    "Copyright © UWorld. All rights reserved."
]

print("SEARCHING FOR MISSING EDUCATIONAL OBJECTIVE TEXT")
print("=" * 50)

# Keywords from the complete educational objective
keywords = [
    "peripheral neuropathy",
    "pain/paresthesia", 
    "median nerve distribution",
    "palmar surface",
    "first 3 digits",
    "radial half",
    "fourth digit",
    "thumb abduction",
    "opposition",
    "thenar atrophy",
    "positive Tinel sign"
]

print("Looking for educational objective keywords in all blocks:")
print()

found_matches = []
for i, block in enumerate(text_blocks):
    block_lower = block.lower()
    for keyword in keywords:
        if keyword.lower() in block_lower:
            found_matches.append((i, block, keyword))
            print(f"Block {i:2d}: '{block[:80]}...' --> Contains: '{keyword}'")

print(f"\nTotal matches found: {len(found_matches)}")

# Look specifically around the educational objective area
print(f"\nDetailed analysis around Educational Objective area:")
edu_index = -1
for i, block in enumerate(text_blocks):
    if block.strip() == "Educational objective:":
        edu_index = i
        break

if edu_index != -1:
    print(f"Educational objective header at block {edu_index}")
    for i in range(max(0, edu_index-5), min(len(text_blocks), edu_index+10)):
        marker = " --> " if i == edu_index else "     "
        marker += " *** " if i == edu_index + 1 else "     "
        print(f"{marker}Block {i:2d}: '{text_blocks[i]}'")

print(f"\nCONCLUSION:")
print("The complete educational objective from the image is NOT present in the OCR blocks.")
print("Only the ending 'caused by median nerve compression at the transverse carpal ligament.' is detected.")
print("The OCR is missing the beginning: 'Carpal tunnel syndrome is a peripheral neuropathy characterized by...'")
