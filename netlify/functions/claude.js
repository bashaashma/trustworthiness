const UNDERWRITING_RULES = [
  {
    id: "UW-001",
    title: "Vacancy over 60 days",
    decision: "POTENTIAL_DECLINE",
    category: "Property",
    keywords: ["vacant", "vacancy", "unoccupied", "empty", "60 days", "90 days"],
    text: "Properties vacant or unoccupied beyond 60 days may meet decline criteria and require escalation. Extended vacancy increases undiscovered water, fire, vandalism, and maintenance loss exposure.",
  },
  {
    id: "UW-002",
    title: "Vacancy over 90 days",
    decision: "DECLINE",
    category: "Property",
    keywords: ["vacant", "vacancy", "unoccupied", "90 days", "95 days", "120 days"],
    text: "Properties vacant beyond 90 days generally meet decline criteria unless a specific vacancy program or binding exception applies.",
  },
  {
    id: "UW-003",
    title: "Three or more losses in 36 months",
    decision: "DECLINE",
    category: "Loss History",
    keywords: ["3 losses", "three losses", "multiple losses", "loss history", "claims history", "24 months", "36 months"],
    text: "Three or more losses within 36 months generally meet decline criteria. Two losses within 24 months may meet potential decline criteria depending on severity and remediation.",
  },
  {
    id: "UW-004",
    title: "Unrepaired prior loss damage",
    decision: "DECLINE",
    category: "Property Condition",
    keywords: ["unrepaired", "prior loss", "damage", "open claim", "roof leak", "water damage", "fire damage"],
    text: "Open, unrepaired, or materially unrepaired prior loss damage generally meets decline criteria until repairs are completed and documented.",
  },
  {
    id: "UW-005",
    title: "Roof age threshold",
    decision: "POTENTIAL_DECLINE",
    category: "Property Condition",
    keywords: ["roof", "20 years", "25 years", "old roof", "aged roof"],
    text: "Roofs older than 20 years may meet potential decline criteria and often require inspection, updates, or evidence of remaining useful life. A severely deteriorated roof can support a decline decision.",
  },
  {
    id: "UW-006",
    title: "Knob-and-tube, aluminum, or unsafe electrical",
    decision: "POTENTIAL_DECLINE",
    category: "Property Condition",
    keywords: ["knob and tube", "aluminum wiring", "federal pacific", "unsafe electrical", "electrical panel"],
    text: "Unsafe or obsolete electrical systems may meet potential decline criteria and usually require repair, upgrade, or inspection before binding. Known hazardous panels or confirmed deficiencies can support decline.",
  },
  {
    id: "UW-007",
    title: "Brush or wildfire exposure without mitigation",
    decision: "POTENTIAL_DECLINE",
    category: "Catastrophe Exposure",
    keywords: ["wildfire", "brush", "brush zone", "defensible space", "mitigation"],
    text: "Severe brush or wildfire exposure without defensible space or mitigation may meet potential decline criteria and commonly requires referral, inspection, or risk improvement documentation.",
  },
  {
    id: "UW-008",
    title: "Dog bite or prohibited animal exposure",
    decision: "POTENTIAL_DECLINE",
    category: "Liability",
    keywords: ["dog bite", "bite history", "animal", "aggressive dog", "prohibited breed"],
    text: "Prior dog bite history or prohibited animal exposures may meet potential decline criteria and can support decline depending on breed, injury severity, and controls.",
  },
  {
    id: "UW-009",
    title: "Trampoline or unfenced pool",
    decision: "POTENTIAL_DECLINE",
    category: "Liability",
    keywords: ["trampoline", "pool", "unfenced", "diving board"],
    text: "Attractive nuisances such as trampolines or unfenced pools may meet potential decline criteria unless required protections, fencing, and loss controls are verified.",
  },
  {
    id: "UW-010",
    title: "Restaurant fire protection deficiencies",
    decision: "DECLINE",
    category: "Commercial Property",
    keywords: ["restaurant", "grease hood", "suppression", "ansul", "fire protection", "inspection report"],
    text: "Restaurants with missing or deficient hood suppression, materially overdue inspections, or unresolved fire protection deficiencies generally meet decline criteria until corrected.",
  },
  {
    id: "UW-011",
    title: "DUI and multiple at-fault accidents",
    decision: "POTENTIAL_DECLINE",
    category: "Auto",
    keywords: ["dui", "dwi", "at-fault", "accidents", "lapse in coverage", "violation"],
    text: "Recent DUI, multiple at-fault accidents, or a coverage lapse may meet potential decline criteria and usually require referral to a non-standard market. Combined adverse driving factors can support decline.",
  },
  {
    id: "UW-012",
    title: "Missing critical inspection or documentation",
    decision: "REFER",
    category: "Documentation",
    keywords: ["missing inspection", "no inspection", "missing report", "documentation", "unclear", "unknown"],
    text: "If key facts are missing, unclear, or dependent on inspection results, the file should be referred rather than accepted. Do not force acceptance when required documentation is absent.",
  },
];

const SYSTEM_PROMPT = `You are an insurance underwriting decision assistant using retrieval-augmented generation.

You will receive:
1. A user scenario.
2. Retrieved underwriting guideline snippets.

Your task is to classify the case using exactly one of these decisions:
- DECLINE: the facts clearly match decline criteria in the retrieved rules.
- POTENTIAL_DECLINE: the facts may meet decline criteria, but some facts are borderline, incomplete, or conditionally remediable.
- REFER: the file lacks enough verified information or requires underwriting review beyond the available facts.
- ACCEPT: none of the retrieved evidence supports decline or potential decline, and the case appears acceptable on the available facts.

Hard rules:
- Base your reasoning on the retrieved rules, not on unsupported assumptions.
- Use the most relevant retrieved rule IDs in your explanation.
- If facts are missing and prevent a firm decision, use REFER or POTENTIAL_DECLINE rather than ACCEPT.
- If the scenario strongly matches a DECLINE rule, do not soften it to ACCEPT.
- Return valid JSON only.

Return this JSON schema:
{
  "decision": "DECLINE | POTENTIAL_DECLINE | REFER | ACCEPT",
  "summary": "one short paragraph",
  "reasoning": ["reason 1", "reason 2", "reason 3"],
  "conditions": ["optional condition or missing info"],
  "cited_rule_ids": ["UW-001", "UW-002"],
  "confidence": 0.0
}`;

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function unique(arr) {
  return [...new Set(arr)];
}

function scoreRule(rule, scenario) {
  const scenarioLower = scenario.toLowerCase();
  const terms = tokenize(scenarioLower);
  let score = 0;
  const matchedTerms = [];

  for (const kw of rule.keywords) {
    const kwLower = kw.toLowerCase();
    if (scenarioLower.includes(kwLower)) {
      score += kwLower.includes(" ") ? 8 : 5;
      matchedTerms.push(kw);
    }
  }

  for (const term of terms) {
    if (term.length < 4) continue;
    if (rule.text.toLowerCase().includes(term)) {
      score += 1;
      matchedTerms.push(term);
    }
  }

  // small boost for stronger actions
  if (rule.decision === "DECLINE") score += 0.75;
  if (rule.decision === "POTENTIAL_DECLINE") score += 0.35;

  return { score, matchedTerms: unique(matchedTerms).slice(0, 8) };
}

function retrieveRules(scenario, limit = 5) {
  const scored = UNDERWRITING_RULES.map((rule) => {
    const { score, matchedTerms } = scoreRule(rule, scenario);
    return { ...rule, retrievalScore: score, matchedTerms };
  })
    .filter((rule) => rule.retrievalScore > 0)
    .sort((a, b) => b.retrievalScore - a.retrievalScore)
    .slice(0, limit);

  return scored.length > 0 ? scored : UNDERWRITING_RULES.slice(0, 3).map((rule) => ({ ...rule, retrievalScore: 0, matchedTerms: [] }));
}

function extractJson(text) {
  if (!text) return null;
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {}

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function normalizeDecision(value) {
  const allowed = ["DECLINE", "POTENTIAL_DECLINE", "REFER", "ACCEPT"];
  return allowed.includes(value) ? value : "REFER";
}

function formatDecisionText(result, retrievedRules) {
  const lines = [
    `Decision: ${result.decision}`,
    `Summary: ${result.summary || "No summary provided."}`,
    "",
    "Reasons:",
    ...(Array.isArray(result.reasoning) && result.reasoning.length ? result.reasoning.map((item) => `- ${item}`) : ["- No reasoning provided."]),
  ];

  if (Array.isArray(result.conditions) && result.conditions.length) {
    lines.push("", "Conditions / Missing Information:", ...result.conditions.map((item) => `- ${item}`));
  }

  lines.push(
    "",
    `Cited Rules: ${(Array.isArray(result.cited_rule_ids) && result.cited_rule_ids.length ? result.cited_rule_ids.join(", ") : "None")}`,
    `Confidence: ${typeof result.confidence === "number" ? result.confidence : 0.5}`,
  );

  if (retrievedRules?.length) {
    lines.push(
      "",
      "Retrieved Guideline Snippets:",
      ...retrievedRules.map((rule) => `- ${rule.id} (${rule.decision}): ${rule.title}`),
    );
  }

  return lines.join("\n");
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing ANTHROPIC_API_KEY environment variable" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const inputMessages = Array.isArray(body.messages) ? body.messages : [];
    const messages = inputMessages
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content }));

    if (messages.length === 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Request must include a non-empty messages array" }),
      };
    }

    const latestUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const retrievedRules = retrieveRules(latestUserMessage, 5);
    const retrievalContext = retrievedRules
      .map((rule) => `[${rule.id}] ${rule.title} | ${rule.decision} | ${rule.text}`)
      .join("\n");

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
        max_tokens: 900,
        system: SYSTEM_PROMPT,
        messages: [
          ...messages,
          {
            role: "user",
            content: `Retrieved underwriting rules:\n${retrievalContext}\n\nUsing only the retrieved rules and the scenario context above, return the underwriting decision JSON now.`,
          },
        ],
      }),
    });

    const data = await anthropicResponse.json().catch(() => ({}));

    if (!anthropicResponse.ok) {
      return {
        statusCode: anthropicResponse.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: data?.error?.message || `Anthropic API error: ${anthropicResponse.status}`,
          details: data,
        }),
      };
    }

    const rawText = Array.isArray(data.content)
      ? data.content
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("\n")
      : "";

    const parsed = extractJson(rawText) || {};
    const result = {
      decision: normalizeDecision(parsed.decision),
      summary: typeof parsed.summary === "string" ? parsed.summary : "Decision generated from retrieved underwriting rules.",
      reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning.slice(0, 5) : [],
      conditions: Array.isArray(parsed.conditions) ? parsed.conditions.slice(0, 5) : [],
      cited_rule_ids: Array.isArray(parsed.cited_rule_ids) ? parsed.cited_rule_ids.filter((x) => typeof x === "string").slice(0, 6) : [],
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    };

    const text = formatDecisionText(result, retrievedRules);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, result, retrievedRules, raw: data }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Unexpected server error" }),
    };
  }
};
