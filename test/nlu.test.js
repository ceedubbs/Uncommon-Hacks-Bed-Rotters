// test/nlu.test.js - Testing the NLU capabilities
const nlu = require('../utils/nlu');

// Test cases for symptom extraction
const symptomTestCases = [
  {
    description: "Simple symptom mention",
    message: "I'm feeling really nauseous today.",
    expectedSymptoms: ["nausea"]
  },
  {
    description: "Multiple symptoms",
    message: "I have a bad headache and I'm also feeling very tired since my treatment yesterday.",
    expectedSymptoms: ["headache", "fatigue"]
  },
  {
    description: "Symptom with severity",
    message: "I'm experiencing severe pain in my joints after the chemo.",
    expectedSymptoms: ["pain"],
    expectedSeverity: "severe"
  },
  {
    description: "Symptom improvement",
    message: "My nausea is much better today than it was yesterday.",
    expectedSymptoms: ["nausea"],
    expectedContext: "improving"
  },
  {
    description: "Indirect symptom mention",
    message: "I can't seem to keep any food down since the treatment.",
    expectedSymptoms: ["nausea", "vomiting"]
  }
];

// Test cases for treatment date extraction
const treatmentDateTestCases = [
  {
    description: "Explicit treatment date",
    message: "My next treatment is on March 15th at 2pm.",
    shouldExtractDate: true
  },
  {
    description: "Relative day mention",
    message: "I have chemo scheduled for next Monday at 10am.",
    shouldExtractDate: true
  },
  {
    description: "Appointment mention",
    message: "I have an appointment with Dr. Smith on the 20th for my next round.",
    shouldExtractDate: true
  },
  {
    description: "No date mentioned",
    message: "I'm worried about my next treatment.",
    shouldExtractDate: false
  }
];

// Test cases for wellness rating
const wellnessTestCases = [
  {
    description: "Numeric rating",
    message: "I'd rate my wellness as 7 out of 10 today.",
    expectedRating: 7
  },
  {
    description: "Feeling description - good",
    message: "I'm feeling pretty good today after getting some rest.",
    expectedRatingRange: [7, 9]
  },
  {
    description: "Feeling description - bad",
    message: "I'm feeling really terrible today, everything hurts.",
    expectedRatingRange: [1, 3]
  },
  {
    description: "Comparative statement",
    message: "I'm feeling much better than yesterday.",
    expectedContext: "improving"
  }
];

// Test cases for name extraction
const nameTestCases = [
  {
    description: "Direct name statement",
    message: "My name is Sarah.",
    expectedName: "Sarah"
  },
  {
    description: "Introduction style",
    message: "Hi there, I'm Michael and I'm starting treatment next week.",
    expectedName: "Michael"
  },
  {
    description: "Call me statement",
    message: "You can call me Robert.",
    expectedName: "Robert"
  },
  {
    description: "No name mentioned",
    message: "I'm not feeling well today.",
    expectedName: null
  }
];

// Test cases for diagnosis extraction
const diagnosisTestCases = [
  {
    description: "Direct diagnosis statement",
    message: "I was diagnosed with Stage 3 Lung Cancer last month.",
    expectedDiagnosis: "Stage 3 Lung Cancer"
  },
  {
    description: "I have statement",
    message: "I have breast cancer and I'm starting my second round of chemo.",
    expectedDiagnosis: "breast cancer"
  },
  {
    description: "Treating statement",
    message: "They're treating my lymphoma with R-CHOP protocol.",
    expectedDiagnosis: "lymphoma"
  },
  {
    description: "No diagnosis mentioned",
    message: "The doctor said my blood counts are looking better.",
    expectedDiagnosis: null
  }
];

// Run symptom extraction tests
function testSymptomExtraction() {
  console.log("\n=== TESTING SYMPTOM EXTRACTION ===");
  
  let passCount = 0;
  
  for (const testCase of symptomTestCases) {
    console.log(`\nTest: ${testCase.description}`);
    console.log(`Message: "${testCase.message}"`);
    
    const extractedSymptoms = nlu.extractSymptoms(testCase.message);
    
    console.log(`Extracted ${extractedSymptoms.length} symptoms:`);
    extractedSymptoms.forEach(s => {
      console.log(`- ${s.name} (${s.severity})`);
    });
    
    // Check if expected symptoms were found
    const extractedSymptomNames = extractedSymptoms.map(s => s.name);
    const missingSymptoms = testCase.expectedSymptoms.filter(s => !extractedSymptomNames.includes(s));
    
    if (missingSymptoms.length === 0) {
      console.log("✅ All expected symptoms were detected");
      
      // Check severity if expected
      if (testCase.expectedSeverity) {
        const hasSeverity = extractedSymptoms.some(s => s.severity === testCase.expectedSeverity);
        if (hasSeverity) {
          console.log(`✅ Expected severity "${testCase.expectedSeverity}" was detected`);
        } else {
          console.log(`❌ Expected severity "${testCase.expectedSeverity}" was NOT detected`);
        }
      }
      
      // Check context if expected
      if (testCase.expectedContext) {
        const hasContext = extractedSymptoms.some(s => s.temporalContext === testCase.expectedContext);
        if (hasContext) {
          console.log(`✅ Expected context "${testCase.expectedContext}" was detected`);
        } else {
          console.log(`❌ Expected context "${testCase.expectedContext}" was NOT detected`);
        }
      }
      
      passCount++;
    } else {
      console.log(`❌ Missing expected symptoms: ${missingSymptoms.join(', ')}`);
    }
  }
  
  console.log(`\nSymptom Extraction Tests: ${passCount}/${symptomTestCases.length} passed`);
}

// Run treatment date extraction tests
function testTreatmentDateExtraction() {
  console.log("\n=== TESTING TREATMENT DATE EXTRACTION ===");
  
  let passCount = 0;
  
  for (const testCase of treatmentDateTestCases) {
    console.log(`\nTest: ${testCase.description}`);
    console.log(`Message: "${testCase.message}"`);
    
    const extractedDates = nlu.extractTreatmentDates(testCase.message);
    
    console.log(`Extracted ${extractedDates.length} dates:`);
    extractedDates.forEach(d => {
      console.log(`- ${d.date.toLocaleString()} (${d.confidence})`);
    });
    
    if ((extractedDates.length > 0) === testCase.shouldExtractDate) {
      console.log("✅ Date extraction result matches expectation");
      passCount++;
    } else {
      console.log(`❌ Expected ${testCase.shouldExtractDate ? 'to find' : 'not to find'} a date`);
    }
  }
  
  console.log(`\nTreatment Date Extraction Tests: ${passCount}/${treatmentDateTestCases.length} passed`);
}

// Run wellness rating tests
function testWellnessRatingExtraction() {
  console.log("\n=== TESTING WELLNESS RATING EXTRACTION ===");
  
  let passCount = 0;
  
  for (const testCase of wellnessTestCases) {
    console.log(`\nTest: ${testCase.description}`);
    console.log(`Message: "${testCase.message}"`);
    
    const extractedRating = nlu.extractWellnessRating(testCase.message);
    
    if (extractedRating) {
      console.log(`Extracted rating: ${extractedRating.rating} (${extractedRating.confidence})`);
      
      // Check for exact match
      if (testCase.expectedRating && extractedRating.rating === testCase.expectedRating) {
        console.log(`✅ Rating matches expected value: ${testCase.expectedRating}`);
        passCount++;
      } 
      // Check for range match
      else if (testCase.expectedRatingRange && 
               extractedRating.rating >= testCase.expectedRatingRange[0] && 
               extractedRating.rating <= testCase.expectedRatingRange[1]) {
        console.log(`✅ Rating ${extractedRating.rating} is within expected range: ${testCase.expectedRatingRange[0]}-${testCase.expectedRatingRange[1]}`);
        passCount++;
      }
      // Check for context match
      else if (testCase.expectedContext && extractedRating.descriptor === testCase.expectedContext) {
        console.log(`✅ Context "${extractedRating.descriptor}" matches expected: ${testCase.expectedContext}`);
        passCount++;
      } 
      else {
        console.log("❌ Extracted rating does not match expectations");
      }
    } else {
      console.log("No rating extracted");
      
      if (!testCase.expectedRating && !testCase.expectedRatingRange) {
        console.log("✅ No rating was expected");
        passCount++;
      } else {
        console.log("❌ A rating was expected but none was extracted");
      }
    }
  }
  
  console.log(`\nWellness Rating Tests: ${passCount}/${wellnessTestCases.length} passed`);
}

// Run name extraction tests
function testNameExtraction() {
  console.log("\n=== TESTING NAME EXTRACTION ===");
  
  let passCount = 0;
  
  for (const testCase of nameTestCases) {
    console.log(`\nTest: ${testCase.description}`);
    console.log(`Message: "${testCase.message}"`);
    
    const extractedName = nlu.extractName(testCase.message);
    
    if (extractedName) {
      console.log(`Extracted name: ${extractedName}`);
      
      if (extractedName === testCase.expectedName) {
        console.log(`✅ Name matches expected: ${testCase.expectedName}`);
        passCount++;
      } else {
        console.log(`❌ Extracted name "${extractedName}" does not match expected "${testCase.expectedName}"`);
      }
    } else {
      console.log("No name extracted");
      
      if (testCase.expectedName === null) {
        console.log("✅ No name was expected");
        passCount++;
      } else {
        console.log(`❌ Expected name "${testCase.expectedName}" but none was extracted`);
      }
    }
  }
  
  console.log(`\nName Extraction Tests: ${passCount}/${nameTestCases.length} passed`);
}

// Run diagnosis extraction tests
function testDiagnosisExtraction() {
  console.log("\n=== TESTING DIAGNOSIS EXTRACTION ===");
  
  let passCount = 0;
  
  for (const testCase of diagnosisTestCases) {
    console.log(`\nTest: ${testCase.description}`);
    console.log(`Message: "${testCase.message}"`);
    
    const extractedDiagnosis = nlu.extractDiagnosis(testCase.message);
    
    if (extractedDiagnosis) {
      console.log(`Extracted diagnosis: ${extractedDiagnosis}`);
      
      if (extractedDiagnosis.toLowerCase() === testCase.expectedDiagnosis.toLowerCase()) {
        console.log(`✅ Diagnosis matches expected: ${testCase.expectedDiagnosis}`);
        passCount++;
      } else {
        console.log(`❌ Extracted diagnosis "${extractedDiagnosis}" does not match expected "${testCase.expectedDiagnosis}"`);
      }
    } else {
      console.log("No diagnosis extracted");
      
      if (testCase.expectedDiagnosis === null) {
        console.log("✅ No diagnosis was expected");
        passCount++;
      } else {
        console.log(`❌ Expected diagnosis "${testCase.expectedDiagnosis}" but none was extracted`);
      }
    }
  }
  
  console.log(`\nDiagnosis Extraction Tests: ${passCount}/${diagnosisTestCases.length} passed`);
}

// Run all tests
function runAllTests() {
  console.log("=== NLU TESTING SUITE ===");
  
  // Run individual test suites
  testSymptomExtraction();
  testTreatmentDate();
}