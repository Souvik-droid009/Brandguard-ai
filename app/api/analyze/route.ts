import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, Schema } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const reviewSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    complianceScore: {
      type: Type.INTEGER,
      description: "Score from 0 to 100 indicating compliance with brand guidelines.",
    },
    overallSummary: {
      type: Type.STRING,
      description: "A 1-2 sentence executive summary of the review.",
    },
    issues: {
      type: Type.ARRAY,
      description: "Specific brand, tone, factual, visual, or accessibility issues.",
      items: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            description: "One of: Tone, Terminology, Unsupported Claim, Visual Consistency, Accessibility, Outdated Info.",
          },
          severity: {
            type: Type.STRING,
            description: "One of: High, Medium, Low.",
          },
          problematicSnippet: {
            type: Type.STRING,
            description: "Exact problematic phrase or visual element.",
          },
          explanation: {
            type: Type.STRING,
            description: "Explanation referencing the violated guideline.",
          },
          suggestedFix: {
            type: Type.STRING,
            description: "Actionable suggested correction.",
          },
          guidelineClarityFlag: {
            type: Type.BOOLEAN,
            description: "True if the guideline is ambiguous.",
          },
        },
        required: [
          "category",
          "severity",
          "problematicSnippet",
          "explanation",
          "suggestedFix",
          "guidelineClarityFlag",
        ],
      },
    },
    revisedContent: {
      type: Type.STRING,
      description: "Complete corrected text or document review recommendations.",
    },
  },
  required: [
    "complianceScore",
    "overallSummary",
    "issues",
    "revisedContent",
  ],
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      content,
      guidelines,
      imageBase64,
      imageMimeType,
      pdfBase64,
      pdfFileName,
    } = body;

    // Check API key
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is missing in .env.local" },
        { status: 500 }
      );
    }

    // Accept text, image, or PDF
    if (!content?.trim() && !imageBase64 && !pdfBase64) {
      return NextResponse.json(
        {
          error: "Please provide text content or upload an image or PDF to analyze.",
        },
        { status: 400 }
      );
    }

    const systemPrompt = `
You are Inkloom AI, an enterprise brand-governance and compliance engine.

Your job is to review draft content, documents and visuals BEFORE publication against the organization's approved brand guidelines.

APPROVED BRAND GUIDELINES & FACTS:
${guidelines || "No additional brand guidelines provided."}

INSTRUCTIONS:

1. Check for issues in:
   - Tone
   - Terminology
   - Unsupported promotional claims
   - Visual consistency
   - Accessibility
   - Outdated information

2. If a PDF document is attached:
   - READ AND ANALYZE THE ACTUAL PDF CONTENT.
   - Examine the document's text and visible pages.
   - Identify problematic claims, terminology and brand inconsistencies.
   - Check all relevant pages, not just the first page.
   - Include the PDF filename in your understanding: ${pdfFileName || "Uploaded PDF"}.
   - Report specific problems with relevant excerpts.
   - Do not claim to have found something that is not present in the document.

3. If an image is attached, analyze its colors, design, readability, contrast and brand consistency.

4. Suggest corrections that preserve the original purpose.

5. Set guidelineClarityFlag to true if a guideline is ambiguous.

6. Provide a complete revisedContent containing corrected text where possible. For PDF-only submissions, provide a useful document review and recommended corrections rather than pretending to have edited the original PDF.

7. If no issues are found, return an empty issues array and a high compliance score.
`;

    // Prepare Gemini input
    const contents: any[] = [systemPrompt];

    // Add text content
    if (content?.trim()) {
      contents.push(
        `DRAFT CONTENT TO REVIEW:\n${content}`
      );
    }

    // Add image
    if (imageBase64 && imageMimeType) {
      contents.push({
        inlineData: {
          data: imageBase64,
          mimeType: imageMimeType,
        },
      });

      contents.push(
        "Analyze the attached image for brand consistency, professionalism, accessibility and visual quality."
      );
    }

    // ADD PDF TO GEMINI INPUT
    if (pdfBase64) {
      contents.push({
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64,
        },
      });

      contents.push(
        `Analyze the complete attached PDF document: ${pdfFileName || "Uploaded PDF"}. Read its contents and review it against the approved brand guidelines.`
      );
    }

    // Generate AI analysis
    let response;

    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: reviewSchema,
          temperature: 0.2,
        },
      });
    } catch (primaryError: any) {
      console.warn(
        "Primary Gemini model failed. Trying fallback model:",
        primaryError?.message
      );

      response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: reviewSchema,
          temperature: 0.2,
        },
      });
    }


    // Read AI response
    const resultText = response.text;

    if (!resultText) {
      throw new Error("Empty response from Gemini. Please try again.");
    }

    const parsedData = JSON.parse(resultText);

    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error("API Analyze Error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Failed to analyze content. Please try again.",
      },
      { status: 500 }
    );
  }
}
