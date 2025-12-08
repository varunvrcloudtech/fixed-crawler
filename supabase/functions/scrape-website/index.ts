// Follow Deno Edge Function format
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, apikey",
};

const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1/scrape";

interface ScrapeRequest {
  url: string;
  formats?: string[];
  onlyMainContent?: boolean;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get API key from environment
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    
    // Debug: Log available env vars (remove in production)
    console.log("Environment check:");
    console.log("FIRECRAWL_API_KEY exists:", !!FIRECRAWL_API_KEY);
    console.log("FIRECRAWL_API_KEY length:", FIRECRAWL_API_KEY?.length || 0);

    if (!FIRECRAWL_API_KEY) {
      console.error("FIRECRAWL_API_KEY is not set in environment");
      return new Response(
        JSON.stringify({ 
          error: "Firecrawl API key not configured",
          debug: "The FIRECRAWL_API_KEY secret is not available to this function"
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Parse request body
    const body: ScrapeRequest = await req.json();
    
    if (!body.url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("Scraping URL:", body.url);

    // Call Firecrawl API
    const firecrawlResponse = await fetch(FIRECRAWL_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: body.url,
        formats: body.formats || ["markdown", "html"],
        onlyMainContent: body.onlyMainContent ?? true,
      }),
    });

    const firecrawlData = await firecrawlResponse.json();

    console.log("Firecrawl response status:", firecrawlResponse.status);

    if (!firecrawlResponse.ok) {
      console.error("Firecrawl error:", firecrawlData);
      return new Response(
        JSON.stringify({ 
          error: "Firecrawl API error", 
          details: firecrawlData,
          status: firecrawlResponse.status 
        }),
        {
          status: firecrawlResponse.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Return successful response
    return new Response(
      JSON.stringify(firecrawlData),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        message: error.message 
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});