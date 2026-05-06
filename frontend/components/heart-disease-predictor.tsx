export interface HeartPredictionInput {
  age: number;
  sex: 0 | 1;
  trestbps: number;
  chol: number;
  thalach: number;
  oldpeak: number;
  ca: number | '';
  cp: number;
  fbs: 0 | 1;
  restecg: number;
  exang: 0 | 1;
  slope: number;
  thal: number;
}

export interface HeartPredictionResult {
  prediction: 0 | 1;
  probability: number;
  confidence: number;
  all_probabilities?: Record<string, number>;
  message?: string;
  // Add the actual backend fields for mapping
  probability_disease?: number;
  probability_no_disease?: number;
}

export const predictHeartDisease = async (inputData: HeartPredictionInput): Promise<HeartPredictionResult> => {
  // Get JWT token from localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  
  if (!token) {
    throw new Error('Authentication required. Please log in again.');
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  // FIX: Convert ALL fields to numbers and handle empty ca properly
  const processedData = {
    age: Number(inputData.age),
    sex: Number(inputData.sex),
    trestbps: Number(inputData.trestbps),
    chol: Number(inputData.chol),
    thalach: Number(inputData.thalach),
    oldpeak: Number(inputData.oldpeak),
    ca: inputData.ca === '' ? 0 : Number(inputData.ca), // Convert empty string to 0 and ensure it's a number
    cp: Number(inputData.cp),
    fbs: Number(inputData.fbs),
    restecg: Number(inputData.restecg),
    exang: Number(inputData.exang),
    slope: Number(inputData.slope),
    thal: Number(inputData.thal)
  };

  const response = await fetch(`${apiUrl}/predict-heart`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(processedData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Prediction failed with status ${response.status}: ${errorText}`);
  }

  // FIX: Handle numpy boolean serialization issue and field mapping
  const responseText = await response.text();
  
  try {
    // Try to parse the JSON normally first
    const result = JSON.parse(responseText);
    
    // FIX: Map backend field names to frontend expected names
    const mappedResult: HeartPredictionResult = {
      prediction: Number(result.prediction) === 1 ? 1 : 0,
      // Use probability_disease from backend as the main probability value
      probability: Number(result.probability_disease ?? result.probability) || 0,
      confidence: Number(result.confidence) || 0,
      all_probabilities: result.all_probabilities ? 
        Object.fromEntries(
          Object.entries(result.all_probabilities).map(([key, value]) => 
            [key, Number(value) || 0]
          )
        ) : {
          // Create all_probabilities from backend fields if not provided
          '0': Number(result.probability_no_disease) || 0,
          '1': Number(result.probability_disease) || 0
        },
      message: result.message,
      // Keep original backend fields for reference
      probability_disease: Number(result.probability_disease) || 0,
      probability_no_disease: Number(result.probability_no_disease) || 0
    };
    
    return mappedResult;
  } catch (parseError) {
    // If parsing fails due to numpy bools, try to clean the response
    try {
      // Replace numpy bool values with regular JavaScript booleans
      const cleanedResponse = responseText
        .replace(/:\s*True\b/g, ': true')
        .replace(/:\s*False\b/g, ': false')
        .replace(/:\s*NaN\b/g, ': 0') // Handle NaN values
        .replace(/<class 'numpy\.bool_'>/g, '');
      
      const result = JSON.parse(cleanedResponse);
      
      // FIX: Map backend field names to frontend expected names
      const mappedResult: HeartPredictionResult = {
        prediction: Number(result.prediction) === 1 ? 1 : 0,
        // Use probability_disease from backend as the main probability value
        probability: Number(result.probability_disease ?? result.probability) || 0,
        confidence: Number(result.confidence) || 0,
        all_probabilities: result.all_probabilities ? 
          Object.fromEntries(
            Object.entries(result.all_probabilities).map(([key, value]) => 
              [key, Number(value) || 0]
            )
          ) : {
            // Create all_probabilities from backend fields if not provided
            '0': Number(result.probability_no_disease) || 0,
            '1': Number(result.probability_disease) || 0
          },
        message: result.message,
        // Keep original backend fields for reference
        probability_disease: Number(result.probability_disease) || 0,
        probability_no_disease: Number(result.probability_no_disease) || 0
      };
      
      return mappedResult;
    } catch (finalError) {
      throw new Error(`Failed to parse server response: ${responseText.substring(0, 200)}`);
    }
  }
};