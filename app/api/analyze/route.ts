import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, Schema } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const reviewSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    complianceScore: {
      type: Type.INTEGER,
      description: "Score from 0 to 100 indicating how well the content follows the brand guidelines.",
    },
    overallSummary: {
      type: Type.STRING,
      description: "A 1-2 sentence executive summary of the review.",
    },
    issues: {
      type: Type.ARRAY,
      description: "List of specific brand, tone, factual, visual, or accessibility issues found.",
      items: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            description: "Must be one of: Tone, Terminology, Unsupported Claim, Visual Consistency, Accessibility, Outdated Info",
          },
          severity: {
            type: Type.STRING,
            description: "Must be one of: High, Medium, Low",
          },
          problematicSnippet: {
            type: Type.STRING,
            description: "The exact phrase or visual element that violates the rule.",
          },
          explanation: {
            type: Type.STRING,
            description: "Clear explanation referencing the specific brand guideline violated.",
          },
          suggestedFix: {
            type: Type.STRING,
            description: "Actionable replacement text or visual fix that preserves the creator's original intent.",
          },
          guidelineClarityFlag: {
            type: Type.BOOLEAN,
            description: "True if the brand guideline seems ambiguous or needs clarification for this case.",
          },
        },
        required: ["category", "severity", "problematicSnippet", "explanation", "suggestedFix", "guidelineClarityFlag"],
      },
    },
    revisedContent: {
      type: Type.STRING,
      description: "The complete rewritten version of the text applying all suggested fixes while preserving the creator's original purpose. If image-only, provide recommended caption/alt-text.",
    },
  },
  required: ["complianceScore", "overallSummary", "issues", "revisedContent"],
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, guidelines, imageBase64, imageMimeType } = body;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is missing in .env.local" },
        { status: 500 }
      );
    }

    if (!content && !imageBase64) {
      return NextResponse.json(
        { error: "Please provide text content or upload an image to analyze." },
        { status: 400 }
      );
    }

    const systemPrompt = `
You are Inkloom AI, an enterprise brand-governance and compliance engine.
Your job is to review draft content (text and/or visuals) BEFORE publication against the organization's Approved Brand Guidelines.

APPROVED BRAND GUIDELINES & FACTS:
${guidelines}

INSTRUCTIONS:
1. Check for issues in: Tone, Terminology, Messaging, Visual Consistency (colors, style, clutter), Accessibility (alt-text, contrast, reading clarity), Outdated Information, and Unsupported Promotional Claims.
2. Instead of simply rejecting content, explain each issue clearly and suggest corrections that preserve the creator's original purpose.
3. Flag 'guidelineClarityFlag: true' if a rule is vague or borderline so leadership knows where guidelines are unclear.
4. Provide a complete 'revisedContent' version that fixes all text issues cleanly.
`;

    const contents: any[] = [systemPrompt];

    if (content) {
      contents.push(`DRAFT CONTENT TO REVIEW:\n"${content}"`);
    }

    if (imageBase64 && imageMimeType) {
      contents.push({
        inlineData: {
          data: imageBase64,
          mimeType: imageMimeType,
        },
      });
      contents.push("Also analyze the attached visual asset for brand color consistency, visual professionalism, accessibility/contrast, and alignment with the brand guidelines.");
    }

    // Try primary model first, fallback to flash-lite if 503 high traffic occurs
    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: reviewSchema,
          temperature: 0.2,
        },
      });
    } catch (primaryError: any) {
      console.warn("Primary model busy, switching to gemini-2.5-flash-lite:", primaryError?.message);
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: reviewSchema,
          temperature: 0.2,
        },
      });
    }

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from Gemini.");
    }

    const parsedData = JSON.parse(resultText);
    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("API Analyze Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to analyze content. Please try again." },
      { status: 500 }
    );
  }
}