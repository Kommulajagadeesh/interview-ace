const HF_API_URL = "https://api-inference.huggingface.co/models/espnet/kan-bayashi_ljspeech_vits";

export async function textToSpeechHuggingFace(text: string): Promise<string | null> {
  const apiKey = import.meta.env.VITE_HF_API_KEY;
  if (!apiKey) {
    console.warn("Hugging Face API key not found. Falling back to native browser speech synthesis.");
    return null;
  }

  try {
    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ inputs: text }),
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API returned status ${response.status}`);
    }

    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
  } catch (error) {
    console.error("Hugging Face text-to-speech API request failed", error);
    return null;
  }
}
