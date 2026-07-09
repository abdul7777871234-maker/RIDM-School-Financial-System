import { GoogleGenAI, Part } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const mimeType = file.type;
    
    // We'll use Gemini 1.5 Flash to extract student data
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Extract student information from the provided file and return it as a JSON array of objects.
      Each object should follow this schema:
      {
        "studentId": "string (generate a unique ID like R-101 if not found)",
        "name": "string",
        "class": "string",
        "parentName": "string",
        "parentContact": "string",
        "totalFee": number,
        "totalPaid": number,
        "paymentPlan": "Monthly" | "Semester" | "Annual" | "Full Payment" | "3 Months",
        "rollNumber": "string (generate a unique sequence if not found, e.g., 001, 002...)"
      }
      
      If data is missing, make reasonable guesses or leave empty strings.
      Return ONLY the JSON array, no markdown formatting.
    `;

    const filePart: Part = {
      inlineData: {
        data: Buffer.from(buffer).toString("base64"),
        mimeType: mimeType,
      },
    };

    const result = await model.generateContent([prompt, filePart]);
    const response = await result.response;
    let text = response.text().trim();
    
    // Clean up potential markdown code blocks
    if (text.startsWith("```json")) {
      text = text.replace(/```json|```/g, "").trim();
    } else if (text.startsWith("```")) {
      text = text.replace(/```/g, "").trim();
    }

    try {
      const students = JSON.parse(text);
      return NextResponse.json({ students });
    } catch (e) {
      console.error("Failed to parse Gemini response:", text);
      return NextResponse.json({ error: "Failed to parse extracted data", raw: text }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Extraction error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
