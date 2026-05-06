'use client';

import { useState } from 'react';



// API Types
interface AnemiaPredictionRequest {
  gender: string;
  hemoglobin: number;
  mch: number;
  mchc: number;
  mcv: number;
}

interface AnemiaPredictionResponse {
  has_anemia: boolean;
  confidence: number;
  anemia_type?: string;
  message: string;
}

// API Service Function
const predictAnemia = async (data: AnemiaPredictionRequest): Promise<AnemiaPredictionResponse> => {
  // Get JWT token from localStorage using correct key
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  
  if (!token) {
    throw new Error('Authentication required. Please log in again.');
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  const response = await fetch(`${apiUrl}/predict-anemia`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Prediction failed with status ${response.status}: ${errorText}`);
  }

  return await response.json();
}

// Main Component
export default function AnemiaPrediction() {
  const [formData, setFormData] = useState<AnemiaPredictionRequest>({
    gender: '',
    hemoglobin: 0,
    mch: 0,
    mchc: 0,
    mcv: 0
  });
  const [result, setResult] = useState<AnemiaPredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError(null);
  
  try {
    const prediction = await predictAnemia(formData);
    setResult(prediction);
    
    // Transform the API response to match results page format
    const resultForStorage = {
      riskLevel: prediction.has_anemia ? "High" : "Low",
      confidence: prediction.confidence,
      recommendations: prediction.has_anemia ? [
        "Consult with a hematologist",
        "Increase iron-rich foods in your diet",
        "Consider iron supplements under medical supervision",
        "Schedule follow-up blood tests in 3 months"
      ] : [
        "Maintain healthy diet rich in iron",
        "Continue regular health check-ups",
        "Monitor blood parameters annually"
      ],
      nextSteps: prediction.message,
      // Keep original data for reference
      originalData: prediction
    };
    
// Store the raw API response directly
sessionStorage.setItem('anemiaResults', JSON.stringify(prediction));
  } catch (err) {
    setError(err instanceof Error ? err.message : 'An error occurred');
  } finally {
    setLoading(false);
  }
};

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'gender' ? value : Number(value)
    }));
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header with Icon */}
      <div className="flex items-center mb-6">
        <div className="bg-red-100 p-3 rounded-full mr-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Anemia Prediction</h2>
          <p className="text-gray-600">Analyze blood parameters to detect anemia</p>
        </div>
      </div>

      {/* Description */}
      <div className="mb-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">About Anemia Detection</h3>
        <p className="text-blue-700 text-sm">
          Anemia is a condition characterized by a deficiency of red blood cells or hemoglobin in the blood. 
          This tool analyzes key blood parameters including hemoglobin levels, mean corpuscular hemoglobin (MCH), 
          mean corpuscular hemoglobin concentration (MCHC), and mean corpuscular volume (MCV) to predict the 
          likelihood of anemia and provide insights into potential types.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gender
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          {/* Hemoglobin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hemoglobin level (g/L)
            </label>
            <input
              type="number"
              name="hemoglobin"
              value={formData.hemoglobin || ''}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              step="0.1"
              placeholder="Enter hemoglobin level"
            />
          </div>

          {/* MCH */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mean Corpuscular Hemoglobin (pg)
            </label>
            <input
              type="number"
              name="mch"
              value={formData.mch || ''}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              step="0.1"
              placeholder="Enter MCH value"
            />
          </div>

          {/* MCHC */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mean Corpuscular Hemoglobin Concentration (g/dL)
            </label>
            <input
              type="number"
              name="mchc"
              value={formData.mchc || ''}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              step="0.1"
              placeholder="Enter MCHC value"
            />
          </div>

          {/* MCV */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mean Corpuscular Volume (fL)
            </label>
            <input
              type="number"
              name="mcv"
              value={formData.mcv || ''}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              step="0.1"
              placeholder="Enter MCV value"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
        >
          {loading ? 'Analyzing...' : 'Predict Anemia'}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`mt-6 p-6 rounded-lg border ${
          result.has_anemia 
            ? 'bg-red-50 border-red-200' 
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center mb-4">
            <div className={`p-2 rounded-full mr-3 ${
              result.has_anemia ? 'bg-red-100' : 'bg-green-100'
            }`}>
              {result.has_anemia ? (
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <h3 className={`text-xl font-semibold ${
              result.has_anemia ? 'text-red-800' : 'text-green-800'
            }`}>
              {result.has_anemia ? 'Anemia Detected' : 'No Anemia Detected'}
            </h3>
          </div>
          
          <div className="space-y-2">
            <p className={result.has_anemia ? 'text-red-700' : 'text-green-700'}>
              {result.message}
            </p>
            {result.anemia_type && (
              <p className="text-gray-700">
                <strong>Type:</strong> {result.anemia_type}
              </p>
            )}
            <p className="text-gray-700">
              <strong>Confidence:</strong> {(result.confidence * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}