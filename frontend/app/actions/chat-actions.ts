"use server"


export async function getHealthAssistantResponse(message: string) {
  try {
    
    const query = message.toLowerCase()

    // Common health questions and answers
    const responses = {
      headache:
        "Headaches can be caused by stress, dehydration, lack of sleep, or eye strain. For occasional headaches, rest, hydration, and over-the-counter pain relievers may help. If headaches are severe or persistent, please consult a healthcare professional.",

      fever:
        "To reduce fever, stay hydrated, rest, and take acetaminophen or ibuprofen as directed. A lukewarm bath may also help. If fever exceeds 103°F (39.4°C) or persists for more than three days, seek medical attention.",

      cold: "Common cold symptoms include runny nose, congestion, sore throat, coughing, and mild fever. Rest, fluids, and over-the-counter medications can help manage symptoms. Most colds resolve within 7-10 days.",

      doctor:
        "You should see a doctor if you have persistent symptoms that don't improve, high fever (over 103°F), severe pain, difficulty breathing, unusual rashes, or if a chronic condition worsens. Always seek immediate help for chest pain or signs of stroke.",

      covid:
        "COVID-19 symptoms may include fever, cough, fatigue, loss of taste/smell, sore throat, and shortness of breath. If you suspect COVID-19, get tested and follow isolation guidelines. Seek medical help if you experience difficulty breathing or persistent chest pain.",

      diet: "A balanced diet includes fruits, vegetables, whole grains, lean proteins, and healthy fats. Aim to eat a variety of colorful foods, limit processed items, and stay hydrated. Remember that individual nutritional needs may vary.",

      exercise:
        "Regular physical activity helps maintain heart health, manage weight, and improve mood. Aim for at least 150 minutes of moderate exercise weekly. Start slowly if you're new to exercise and choose activities you enjoy.",

      sleep:
        "Healthy adults need 7-9 hours of sleep per night. To improve sleep, maintain a regular schedule, create a restful environment, limit screen time before bed, and avoid caffeine and large meals in the evening.",

      stress:
        "Managing stress is important for overall health. Try deep breathing, meditation, regular exercise, adequate sleep, and connecting with supportive people. If stress becomes overwhelming, consider speaking with a mental health professional.",

      water:
        "Proper hydration is essential for health. Most adults should drink about 8 cups (64 ounces) of water daily, but needs vary based on activity level, climate, and individual factors. Your urine should be pale yellow if you're well-hydrated.",
    }

    // Find the most relevant response
    let responseText =
      "I'm here to provide general health information. For specific medical concerns, please consult with a healthcare professional. How else can I help you with your health questions?"

    
    for (const [key, response] of Object.entries(responses)) {
      if (query.includes(key)) {
        responseText = response
        break
      }
    }

    
    await new Promise((resolve) => setTimeout(resolve, 500))

    return {
      success: true,
      message: responseText,
    }
  } catch (error) {
    console.error("Error in mock health assistant:", error)
    return {
      success: false,
      message: "I'm sorry, I couldn't process your request. Please try again later.",
    }
  }
}
