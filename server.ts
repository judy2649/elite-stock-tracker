import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));

// Lazy safety initialization check
const getGeminiClient = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// FULL-STACK SERVER SIDE AI ENDPOINT FOR FORECASTING & ADVISOR INSIGHTS
app.post("/api/ai/forecast", async (req, res) => {
  try {
    const { products = [], sales = [], expenses = [] } = req.body;

    const ai = getGeminiClient();
    if (!ai) {
      // Elegant, rich, static beauty advisor fallback matching standard Ugandan Beauty operations if no API key is set
      return res.json({
        forecastSummary: "Elite Beauty Sales for Kampala looks strong! Solid demand for CeraVe Foaming Cleansers and Matte Lip Stains (Rose Orchid). Growth trends point toward hydrated skin-prep routines and long-wear pigments.",
        trendingInsights: [
          "Bestselling Category is Skin Care with high product value density.",
          "Matte Lip Stain SKU: ELT-LIP-RO shows high sales velocity this week."
        ],
        slowMoversOffers: [
          "Maybelline Foundation near expiry (2026-08-30). Set a 15% discount for custom skincare bundle kits on Instagram.",
          "Organic Rosemary Hair Oil approaching shelf-life threshold. Target as a free beauty-gift with every Oud Velvet purchase."
        ],
        replenishDraftEmail: `Subject: Elite Beauty Stock Order Reservation - Kampala\n\nDear Cosmetics Wholesale Uganda,\n\nWe would like to place an immediate rush order for the following low-stock cosmetics essentials:\n- Victoria's Secret Bare Vanilla Body Mist (15 units) \n- The Ordinary Niacinamide 10% + Zinc 1% (20 units)\n\nPlease send us the proforma invoice for approval.\n\nWarm regards,\nJudith Oyoo\nElite Beauty Uganda\n+256 701 987654`
      });
    }

    const lowStockItems = products.filter((p: any) => p.quantity <= p.safeLevel);
    const nearExpiryItems = products.filter((p: any) => {
      if (!p.expiryDate) return false;
      const expiry = new Date(p.expiryDate);
      const current = new Date("2026-06-13"); // Set our current context date
      const diffTime = expiry.getTime() - current.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 90 && diffDays > -30; // Expiring within 90 days or recently expired
    });

    const totalSalesValue = sales.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0);
    const totalSalesCount = sales.length;

    const systemPrompt = `You are the lead AI advisor for "Elite Beauty", a premium cosmetics shop located in central Kampala, Uganda. 
You are analyzing their store inventory, sales ledger history, and low stock metrics. 
Provide professional, highly contextual, localized feedback for the Ugandan beauty scene (mention Kampala central store or Entebbe branches where appropriate).
You must output a single JSON object. No markdown wrappers or explanation. Use the precise response structure.`;

    const userPrompt = `
Analyze this Kampala Cosmetics Store data:
- TOTAL REGISTERED PRODUCTS: ${products.length}
- CURRENT LOW STOCK ITEMS: ${JSON.stringify(lowStockItems.map((p: any) => ({ name: p.name, sku: p.sku, qty: p.quantity, safe: p.safeLevel })))}
- ITEMS NEAR EXPIRATION (or recently expired): ${JSON.stringify(nearExpiryItems.map((p: any) => ({ name: p.name, sku: p.sku, expiry: p.expiryDate })))}
- RECENT SALES LEDGER: ${JSON.stringify(sales.slice(0, 5).map((s: any) => ({ customer: s.customerName, total: s.totalAmount, items: s.items.map((i: any) => i.productName) })))}
- RECENT EXPENSES: ${JSON.stringify(expenses.slice(0, 3).map((e: any) => ({ title: e.title, amount: e.amount })))}

Generate:
1. 'forecastSummary' (maximum 3 concise sentences summarizing trends, demand shifts, high-velocity skin care, or fragrances).
2. 'trendingInsights' (an array of exactly 2 high value analytical bullet points e.g., shade preferences or Kampala location demand shifts).
3. 'slowMoversOffers' (an array of exactly 2 creative bundle ideas to exhaust expiring or sluggish inventory).
4. 'replenishDraftEmail' (a professional, friendly business email draft addressed to suppliers to replenish those low stock/out of stock items).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["forecastSummary", "trendingInsights", "slowMoversOffers", "replenishDraftEmail"],
          properties: {
            forecastSummary: {
              type: Type.STRING,
              description: "Short analytical paragraph summarizing demand forecasting trends."
            },
            trendingInsights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of exactly 2 crisp insights about high velocity lines or shades."
            },
            slowMoversOffers: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of exactly 2 creative promotions or bundle ideas to flush out expiring or sluggish stocks."
            },
            replenishDraftEmail: {
              type: Type.STRING,
              description: "A ready-to-copy, personalized draft email for beauty wholesale suppliers to buy restocks."
            }
          }
        }
      }
    });

    const outputText = response.text || "{}";
    const data = JSON.parse(outputText.trim());
    return res.json(data);

  } catch (error: any) {
    console.error("AI Forecasting error: ", error);
    return res.status(500).json({ 
      error: "Failed to generate AI insights due to transient server issue.",
      forecastSummary: "Elite Beauty Sales for Kampala central store continue to highlight solid demand for skin care. Try refreshing blemish formula targets.",
      trendingInsights: [
        "Skin Care has shown the highest sales density across Kampala central.",
        "The Ordinary Niacinamide demands instant restock to prevent lost leads."
      ],
      slowMoversOffers: [
        "Bundle Maybelline foundations with local hydration treatments at a customized promo rate of 10% off.",
        "Offer Organic Rosemary growth oils at 20,000 Shs clearance pricing during peak weekend traffic."
      ],
      replenishDraftEmail: "Subject: Stock Clearance Replenishment Restock\n\nTo Supplier,\n\nWe need a quick top-up of out of stock mists.\n\nThanks,\nJudith"
    });
  }
});

// Serve frontend assets & Boot listen instances
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server starting on port ${PORT}`);
  });
}

startServer();
