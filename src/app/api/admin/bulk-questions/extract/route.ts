import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import pdf from 'pdf-parse';



interface ExtractedQuestion {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE?: string;
  correctAnswer: string;
  explanation: string;
  educationalObjective: string;
  tags: string[];
}

function parseQuestionsFromText(text: string): ExtractedQuestion[] {
  const questions: ExtractedQuestion[] = [];
  
  // Try multiple question splitting patterns
  let questionBlocks: string[] = [];
  
  // Pattern 1: "Question X:" (numbered)
  questionBlocks = text.split(/Question\s+\d+:/i).filter(block => block.trim());
  
  // Pattern 2: If no numbered questions found, try splitting by "Question:" (unnumbered)
  if (questionBlocks.length <= 1) {
    questionBlocks = text.split(/Question:/i).filter(block => block.trim());
  }
  
  // Pattern 3: If still no questions, try splitting by multiple choice patterns
  if (questionBlocks.length <= 1) {
    // Split by patterns that indicate new questions (A. followed by 4-5 options)
    const potentialQuestions = text.split(/(?=A\.\s+.*?\n.*?B\.\s+.*?\n.*?C\.\s+.*?\n.*?D\.)/i);
    questionBlocks = potentialQuestions.filter(block => 
      block.trim() && 
      /A\.\s+.*?\n.*?B\.\s+.*?\n.*?C\.\s+.*?\n.*?D\./i.test(block)
    );
  }
  
  // Pattern 4: If still no questions, try page breaks or double line breaks
  if (questionBlocks.length <= 1) {
    questionBlocks = text.split(/\n\n(?=.*?A\.\s+.*?B\.\s+.*?C\.\s+.*?D\.)/i).filter(block => 
      block.trim() && 
      /A\.\s+.*?B\.\s+.*?C\.\s+.*?D\./i.test(block)
    );
  }
  
  console.warn(`Found ${questionBlocks.length} question blocks using flexible parsing`);
  
  for (const block of questionBlocks) {
    try {
      const question = parseIndividualQuestion(block.trim());
      if (question) {
        questions.push(question);
      }
    } catch (error) {
      console.error('Error parsing individual question:', error);
      continue;
    }
  }
  
  return questions;
}

function parseIndividualQuestion(text: string): ExtractedQuestion | null {
  try {
    // Smart text normalization that AGGRESSIVELY preserves bullet points and lists
    const normalizedText = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // FIRST: Identify and protect ALL bullet point patterns
      .replace(/\n(\s*[•\-\*]\s+)/g, '\n\nBULLET_MARKER$1') // Mark bullets
      .replace(/\n(\s*\d+\.\s+)/g, '\n\nNUMBER_MARKER$1') // Mark numbered lists
      // Fix hyphenated words that got split across lines
      .replace(/(\w)-\n(\w)/g, '$1$2')
      .replace(/(\w)-\s+(\w)/g, '$1$2')
      // Smart sentence flow - but AVOID joining anything after markers
      .replace(/([a-z,;:])\n(?!BULLET_MARKER|NUMBER_MARKER)([a-z])/g, '$1 $2') 
      .replace(/(\w)\n(?!BULLET_MARKER|NUMBER_MARKER)([a-z])/g, '$1 $2')
      // Restore markers as proper line breaks
      .replace(/BULLET_MARKER/g, '\n')
      .replace(/NUMBER_MARKER/g, '\n')
      // Ensure proper paragraph breaks
      .replace(/([.!?])\n([A-Z])/g, '$1\n\n$2')
      // Clean up spacing but preserve structure
      .replace(/[ \t]+/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    // Extract question text (everything before the first option, but exclude common headers)
    const optionAIndex = normalizedText.indexOf('A.');
    if (optionAIndex === -1) return null;
    
    let questionTextMatch = normalizedText.substring(0, optionAIndex).trim();
    if (!questionTextMatch) return null;
    
    // Remove common headers that shouldn't be part of question text
    questionTextMatch = questionTextMatch
      .replace(/^(Answer Choices?:?\s*)/i, '') // Remove "Answer Choices:" header
      .replace(/^(Options?:?\s*)/i, '') // Remove "Options:" header
      .replace(/^(Multiple Choice:?\s*)/i, '') // Remove "Multiple Choice:" header
      .replace(/^(Choose the best answer:?\s*)/i, '') // Remove instruction text
      .replace(/^(Select the correct answer:?\s*)/i, '') // Remove instruction text
      .trim();

    // Preserve line breaks in question text
    const questionText = questionTextMatch.replace(/\n{2,}/g, '\n\n').trim();
    
    // Extract options with preserved formatting using indexOf method
    const optionBIndex = normalizedText.indexOf('B.');
    const optionCIndex = normalizedText.indexOf('C.');
    const optionDIndex = normalizedText.indexOf('D.');
    const optionEIndex = normalizedText.indexOf('E.');
    const correctAnswerIndex = normalizedText.indexOf('Correct Answer:');
    
    const optionAText = normalizedText.substring(optionAIndex + 2, optionBIndex).trim().replace(/\n+/g, ' ');
    const optionBText = normalizedText.substring(optionBIndex + 2, optionCIndex).trim().replace(/\n+/g, ' ');
    const optionCText = normalizedText.substring(optionCIndex + 2, optionDIndex).trim().replace(/\n+/g, ' ');
    
    let optionDText: string;
    let optionEText: string | undefined;
    
    if (optionEIndex > 0 && optionEIndex < correctAnswerIndex) {
      // Has option E
      optionDText = normalizedText.substring(optionDIndex + 2, optionEIndex).trim().replace(/\n+/g, ' ');
      optionEText = normalizedText.substring(optionEIndex + 2, correctAnswerIndex).trim().replace(/\n+/g, ' ');
    } else {
      // No option E
      optionDText = normalizedText.substring(optionDIndex + 2, correctAnswerIndex).trim().replace(/\n+/g, ' ');
    }
    
    if (!optionAText || !optionBText || !optionCText || !optionDText) {
      return null;
    }
    
    // Extract correct answer with improved detection
    let correctAnswer: string | undefined;
    
    // Try multiple patterns for correct answer detection
    const patterns = [
      /Correct Answer:\s*([A-E])\./i,           // "Correct Answer: A."
      /Answer:\s*([A-E])\./i,                   // "Answer: A."
      /Correct:\s*([A-E])\./i,                  // "Correct: A."
      /The correct answer is\s*([A-E])\./i,     // "The correct answer is A."
      /Correct Answer:\s*\(([A-E])\)/i,         // "Correct Answer: (A)"
      /Answer:\s*\(([A-E])\)/i,                 // "Answer: (A)"
      /Correct Answer:\s*([A-E])\)/i,           // "Correct Answer: A)"
      /Correct Answer:\s*([A-E])\s/i,           // "Correct Answer: A "
      /Correct Answer:\s*([A-E])$/im            // "Correct Answer: A" at end of line
    ];
    
    for (const pattern of patterns) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        correctAnswer = match[1].toUpperCase();
        // Log which pattern matched for debugging
        console.warn(`Found correct answer '${correctAnswer}' using pattern: ${pattern.toString()}`);
        break;
      }
    }
    
    if (!correctAnswer) {
      // Log the text around where we expect the correct answer for debugging
      const correctAnswerSection = normalizedText.substring(
        Math.max(0, normalizedText.toLowerCase().indexOf('correct') - 50),
        normalizedText.toLowerCase().indexOf('correct') + 150
      );
      console.warn('Could not find correct answer. Text around "correct":', correctAnswerSection);
      return null;
    }
    
    // Extract explanation, educational objective, and tags with flexible detection
    const explanationIndex = Math.max(
      normalizedText.indexOf('Explanation:'),
      normalizedText.indexOf('Rationale:'),
      normalizedText.indexOf('Discussion:')
    );
    
    const educationalObjectiveIndex = Math.max(
      normalizedText.indexOf('Educational Objective:'),
      normalizedText.indexOf('Learning Objective:'),
      normalizedText.indexOf('Objective:'),
      normalizedText.indexOf('Educational Goal:'),
      normalizedText.indexOf('Learning Goal:')
    );
    
    const tagsIndex = Math.max(
      normalizedText.indexOf('Tags:'),
      normalizedText.indexOf('Keywords:'),
      normalizedText.indexOf('Categories:')
    );
    
    let explanation = '';
    if (explanationIndex > -1) {
      const endIndex = educationalObjectiveIndex > -1 ? educationalObjectiveIndex : (tagsIndex > -1 ? tagsIndex : normalizedText.length);
      explanation = normalizedText.substring(explanationIndex + 12, endIndex).trim()
        // Handle choice explanations - each (Choice X) should be a new paragraph
        .replace(/(\s+)\(Choice\s+([A-E])\)/gi, '\n\n(Choice $2)')
        // Ensure bullet points are on separate lines with proper spacing
        .replace(/([.!?:])\s*•/g, '$1\n\n•')
        .replace(/([.!?:])\s*-\s/g, '$1\n\n- ')
        // Fix any bullet points that got merged into text
        .replace(/(\w)\s*•\s*/g, '$1\n\n• ')
        .replace(/(\w)\s*-\s+([A-Z])/g, '$1\n\n- $2')
        // Clean up excessive line breaks but preserve intentional ones
        .replace(/\n{4,}/g, '\n\n');
      
      // SUPER AGGRESSIVE UNIVERSAL MEDICAL BOLD DETECTION
      explanation = explanation
        .replace(/(\*\*.*?\*\*)/g, '$1') // Keep existing markdown bold
        
        // 1. MEDICAL CONDITIONS & DISEASES (expanded with more specific terms)
        .replace(/(\b(?:deficiency|syndrome|disease|disorder|failure|dysfunction|insufficiency|toxicity|infection|sepsis|pneumonia|meningitis|encephalitis|hepatitis|nephritis|arthritis|dermatitis|gastritis|colitis|pancreatitis|pericarditis|endocarditis|myocarditis|thrombosis|embolism|infarction|ischemia|necrosis|cancer|carcinoma|sarcoma|lymphoma|leukemia|anemia|thrombocytopenia|neutropenia|coagulopathy|hemophilia|thalassemia|diabetes|hypertension|hypotension|tachycardia|bradycardia|arrhythmia|fibrillation|stenosis|regurgitation|prolapse|rupture|fracture|dislocation|sprain|strain|contusion|laceration|burn|shock|coma|seizure|stroke|paralysis|paresis|atrophy|hypertrophy|hyperplasia|dysplasia|metaplasia|aplasia|agenesis|malformation|anomaly|obstruction|perforation|bleeding|hemorrhage)\b)/gi, '**$1**')
        
        // 2. ANATOMICAL TERMS (expanded)
        .replace(/(\b(?:heart|lung|liver|kidney|brain|spleen|pancreas|thyroid|adrenal|pituitary|hypothalamus|cerebrum|cerebellum|brainstem|medulla|cortex|ventricle|atrium|aorta|artery|vein|capillary|bronchi|alveoli|nephron|glomeruli|hepatocyte|neuron|axon|dendrite|synapse|muscle|bone|cartilage|tendon|ligament|joint|skin|mucosa|epithelium|endothelium|plasma|serum|blood|urine|CSF|lymph|stomach|intestine|colon|rectum|esophagus|duodenum|jejunum|ileum|gallbladder|bladder|uterus|ovary|testis|prostate|breast|chest|abdomen|pelvis|extremity|head|neck)\b)/gi, '**$1**')
        
        // 3. LABORATORY VALUES & TESTS (comprehensive)
        .replace(/(\b(?:hemoglobin|hematocrit|platelets|WBC|RBC|neutrophils|lymphocytes|eosinophils|basophils|PT|PTT|aPTT|INR|BUN|creatinine|glucose|sodium|potassium|chloride|bicarbonate|calcium|phosphorus|magnesium|albumin|bilirubin|ALT|AST|alkaline phosphatase|LDH|CK|troponin|BNP|TSH|T3|T4|cortisol|insulin|HbA1c|cholesterol|triglycerides|HDL|LDL|amylase|lipase|CRP|ESR|procalcitonin|lactate|pH|pCO2|pO2|oxygen saturation|CBC|BMP|CMP|LFTs|cardiac enzymes|thyroid function|lipid panel|ABG|VBG|urinalysis|culture|sensitivity|gram stain|biopsy|cytology|pathology|X-ray|CT|MRI|ultrasound|endoscopy|colonoscopy|bronchoscopy|echocardiogram|stress test)\b)/gi, '**$1**')
        
        // 4. MEDICATIONS & TREATMENTS (extensive list)
        .replace(/(\b(?:acetaminophen|ibuprofen|aspirin|morphine|fentanyl|lidocaine|epinephrine|norepinephrine|dopamine|dobutamine|furosemide|digoxin|beta-blocker|ACE inhibitor|ARB|calcium channel blocker|diuretic|antibiotic|penicillin|cephalosporin|vancomycin|gentamicin|ciprofloxacin|metronidazole|azithromycin|antiviral|antifungal|steroid|prednisone|hydrocortisone|insulin|metformin|warfarin|heparin|enoxaparin|clopidogrel|statin|PPI|H2 blocker|antihistamine|bronchodilator|inhaler|nebulizer|oxygen|intubation|ventilation|CPAP|BiPAP|dialysis|transfusion|surgery|procedure|intervention|therapy|treatment|management|monitoring|chemotherapy|radiation|immunotherapy)\b)/gi, '**$1**')
        
        // 5. MEDICAL DESCRIPTORS & MODIFIERS (very comprehensive)
        .replace(/(\b(?:acute|chronic|subacute|severe|mild|moderate|progressive|stable|unstable|improving|worsening|elevated|decreased|high|low|normal|abnormal|positive|negative|present|absent|increased|decreased|enlarged|dilated|constricted|stenotic|thrombotic|embolic|ischemic|hemorrhagic|infectious|inflammatory|neoplastic|malignant|benign|metastatic|primary|secondary|tertiary|congenital|acquired|hereditary|familial|idiopathic|iatrogenic|drug-induced|toxic|allergic|autoimmune|immunocompromised|febrile|afebrile|tachycardic|bradycardic|hypertensive|hypotensive|tachypneic|bradypneic|hypoxic|hypercapnic|acidotic|alkalotic|symptomatic|asymptomatic|bilateral|unilateral|diffuse|localized|generalized|focal|multifocal)\b)/gi, '**$1**')
        
        // 6. AGE & DEMOGRAPHIC TERMS
        .replace(/(\b(?:newborn|neonate|infant|toddler|child|adolescent|adult|elderly|geriatric|pediatric|neonatal|maternal|paternal|male|female|pregnant|postpartum|menopausal|premature|term|post-term)\b)/gi, '**$1**')
        
        // 7. TIMING & URGENCY
        .replace(/(\b(?:immediately|urgently|emergently|stat|within \d+ (?:minutes?|hours?|days?)|first-line|second-line|initial|follow-up|maintenance|loading dose|bolus|continuous|intermittent|daily|weekly|monthly|PRN|as needed)\b)/gi, '**$1**')
        
        // 8. CLINICAL HEADERS & KEY PHRASES
        .replace(/(\b(?:diagnosis|differential diagnosis|most likely|least likely|next step|first step|initial management|treatment|therapy|prognosis|complications|contraindications|side effects|adverse effects|mechanism|pathophysiology|etiology|epidemiology|risk factors|clinical presentation|signs|symptoms|physical exam|history|laboratory|imaging|ECG|EKG|chest X-ray|CT|MRI|ultrasound|endoscopy|biopsy)\b)/gi, '**$1**')
        
        // 9. IMPORTANT CLINICAL PHRASES  
        .replace(/(\b(?:key point|important|remember|note|clinical pearl|red flag|warning sign|emergency|critical|life-threatening|potentially fatal|requires immediate|contraindicated|avoid|caution|monitor closely|follow up|most common|rare|typical|atypical|classic|pathognomonic)\b)/gi, '**$1**')
        
        // 10. MEDICAL UNITS & VALUES
        .replace(/(\b(?:\d+\s*(?:mg|g|kg|ml|L|mL|mcg|ng|pg|mmol|mEq|U|IU|bpm|mmHg|celsius|fahrenheit|%|seconds?|minutes?|hours?|days?|weeks?|months?|years?))(?:\s|$))/gi, '**$1**')
        
        // 11. ADDITIONAL COMMON MEDICAL TERMS
        .replace(/(\b(?:patient|diagnosis|symptoms|treatment|medication|dose|therapy|condition|disorder|disease|syndrome|infection|inflammation|pain|fever|nausea|vomiting|diarrhea|constipation|headache|dizziness|fatigue|weakness|shortness of breath|chest pain|abdominal pain|back pain|joint pain|swelling|rash|lesion|mass|nodule|tumor)\b)/gi, '**$1**');
    }
    
    // Extract educational objective with UNIVERSAL medical bold detection
    let educationalObjective = '';
    if (educationalObjectiveIndex > -1) {
      const endIndex = tagsIndex > -1 ? tagsIndex : normalizedText.length;
      
      // Determine the actual header length dynamically
      let headerLength = 22; // Default for "Educational Objective:"
      if (normalizedText.indexOf('Learning Objective:') === educationalObjectiveIndex) {
        headerLength = 19;
      } else if (normalizedText.indexOf('Objective:') === educationalObjectiveIndex) {
        headerLength = 10;
      } else if (normalizedText.indexOf('Educational Goal:') === educationalObjectiveIndex) {
        headerLength = 17;
      } else if (normalizedText.indexOf('Learning Goal:') === educationalObjectiveIndex) {
        headerLength = 14;
      }
      
      educationalObjective = normalizedText.substring(educationalObjectiveIndex + headerLength, endIndex).trim().replace(/\n{3,}/g, '\n\n');
      
      // Universal bold detection for educational objectives
      educationalObjective = educationalObjective
        .replace(/(\*\*.*?\*\*)/g, '$1') // Keep existing markdown bold
        
        // Learning action verbs
        .replace(/(\b(?:understand|recognize|identify|differentiate|diagnose|treat|manage|prevent|describe|explain|analyze|evaluate|assess|interpret|apply|demonstrate|recall|know|learn|master|comprehend)\b)/gi, '**$1**')
        
        // Medical concepts and conditions  
        .replace(/(\b(?:deficiency|syndrome|disease|disorder|failure|infection|bleeding|hemorrhage|coagulopathy|anemia|diabetes|hypertension|pneumonia|sepsis|shock|stroke|infarction|thrombosis|embolism)\b)/gi, '**$1**')
        
        // Key medical terms
        .replace(/(\b(?:pathophysiology|etiology|epidemiology|diagnosis|treatment|management|prognosis|complications|contraindications|side effects|mechanism|clinical presentation|signs|symptoms|risk factors)\b)/gi, '**$1**')
        
        // Laboratory and diagnostic terms
        .replace(/(\b(?:laboratory|imaging|ECG|chest X-ray|CT|MRI|ultrasound|biopsy|culture|CBC|BMP|CMP|PT|PTT|INR|hemoglobin|platelets|glucose|creatinine|electrolytes)\b)/gi, '**$1**')
        
        // Treatment and medication terms
        .replace(/(\b(?:medication|drug|therapy|intervention|surgery|procedure|antibiotic|steroid|insulin|oxygen|transfusion|dialysis|ventilation)\b)/gi, '**$1**')
        
        // Age and demographic terms
        .replace(/(\b(?:newborn|infant|child|adolescent|adult|elderly|pediatric|neonatal|pregnant|male|female)\b)/gi, '**$1**')
        
        // Important qualifiers
        .replace(/(\b(?:acute|chronic|severe|mild|emergency|critical|life-threatening|first-line|initial|immediate|urgent)\b)/gi, '**$1**');
    }
    
    // Extract tags with flexible detection
    let tags: string[] = [];
    if (tagsIndex > -1) {
      // Determine header length
      let headerLength = 5; // Default for "Tags:"
      if (normalizedText.indexOf('Keywords:') === tagsIndex) {
        headerLength = 9;
      } else if (normalizedText.indexOf('Categories:') === tagsIndex) {
        headerLength = 11;
      }
      
      const tagsText = normalizedText.substring(tagsIndex + headerLength).trim();
      tags = tagsText ? tagsText.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    }

    return {
      questionText,
      optionA: optionAText,
      optionB: optionBText,
      optionC: optionCText,
      optionD: optionDText,
      optionE: optionEText || undefined,
      correctAnswer,
      explanation,
      educationalObjective,
      tags,
    };
    
  } catch (error) {
    console.error('Error parsing question:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "MASTER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the uploaded PDF file
    const formData = await request.formData();
    const file = formData.get("pdf") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No PDF file uploaded" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }

    try {
      // Convert file to buffer
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Extract text using pdf-parse
      const pdfData = await pdf(buffer);
      const extractedText = pdfData.text;
      
      // Parse questions from the extracted text
      const questions = parseQuestionsFromText(extractedText);
      
      if (questions.length === 0) {
        return NextResponse.json({ 
          error: "No questions found in PDF. Please ensure the PDF contains properly formatted questions." 
        }, { status: 400 });
      }

      return NextResponse.json({ 
        success: true, 
        questions,
        message: `Successfully extracted ${questions.length} questions from PDF`
      });

    } catch (pdfError) {
      console.error('PDF processing error:', pdfError);
      return NextResponse.json({ 
        error: "Failed to process PDF file. Please ensure it's a valid PDF with text content." 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Bulk question extraction error:', error);
    return NextResponse.json({ 
      error: "Internal server error during question extraction" 
    }, { status: 500 });
  }
}
