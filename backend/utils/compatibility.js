const axios = require('axios');

/**
 * Rule-based fallback scorer. Used when the LLM is unavailable, errors out,
 * times out, or returns an unparseable response.
 *
 * Logic:
 *  - Location: exact/substring case-insensitive match = full location credit,
 *    otherwise 0 location credit.
 *  - Budget: if listing rent falls within [budgetMin, budgetMax] = full budget
 *    credit. Otherwise, credit decays linearly based on how far outside the
 *    range the rent is (capped at 0).
 *  - Final score = 50% location + 50% budget, rounded to nearest integer.
 */
function ruleBasedScore(listing, profile) {
  const loc = (listing.location || '').toLowerCase().trim();
  const prefLoc = (profile.preferredLocation || '').toLowerCase().trim();
  const locationMatch = loc && prefLoc && (loc.includes(prefLoc) || prefLoc.includes(loc));
  const locationScore = locationMatch ? 100 : 0;

  let budgetScore;
  const rent = listing.rent;
  const { budgetMin, budgetMax } = profile;
  if (rent >= budgetMin && rent <= budgetMax) {
    budgetScore = 100;
  } else {
    const range = Math.max(budgetMax - budgetMin, 1);
    const distance = rent < budgetMin ? budgetMin - rent : rent - budgetMax;
    budgetScore = Math.max(0, 100 - (distance / range) * 100);
  }

  const score = Math.round(locationScore * 0.5 + budgetScore * 0.5);

  const explanationParts = [];
  explanationParts.push(
    locationMatch
      ? `Listing location "${listing.location}" matches tenant's preferred location "${profile.preferredLocation}".`
      : `Listing location "${listing.location}" does not match tenant's preferred location "${profile.preferredLocation}".`
  );
  explanationParts.push(
    rent >= budgetMin && rent <= budgetMax
      ? `Rent (${rent}) is within tenant's budget range (${budgetMin}-${budgetMax}).`
      : `Rent (${rent}) is outside tenant's budget range (${budgetMin}-${budgetMax}).`
  );

  return {
    score,
    explanation: explanationParts.join(' '),
    source: 'rule-based',
  };
}

/**
 * Calls the Anthropic API to compute a compatibility score. Returns null if
 * the LLM is not configured, times out, or fails - caller should fall back
 * to the rule-based scorer.
 */
async function llmScore(listing, profile) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

  const prompt = `Given this room listing: ${JSON.stringify({
    location: listing.location,
    rent: listing.rent,
    availableFrom: listing.availableFrom,
    roomType: listing.roomType,
    furnishingStatus: listing.furnishingStatus,
  })} and this tenant profile: ${JSON.stringify({
    preferredLocation: profile.preferredLocation,
    budgetMin: profile.budgetMin,
    budgetMax: profile.budgetMax,
    moveInDate: profile.moveInDate,
  })}, compute a compatibility score from 0 to 100 based on budget and location match. Return ONLY valid JSON in this exact shape and nothing else: { "score": number, "explanation": string }`;

  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        timeout: 8000,
      }
    );

    const textBlock = response.data.content.find((c) => c.type === 'text');
    if (!textBlock) return null;

    const cleaned = textBlock.text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (
      typeof parsed.score !== 'number' ||
      parsed.score < 0 ||
      parsed.score > 100 ||
      typeof parsed.explanation !== 'string'
    ) {
      return null;
    }

    return {
      score: Math.round(parsed.score),
      explanation: parsed.explanation,
      source: 'llm',
    };
  } catch (err) {
    console.error('LLM compatibility scoring failed, falling back to rule-based:', err.message);
    return null;
  }
}

/**
 * Public entry point: tries the LLM first, falls back to rule-based scoring
 * if the LLM is unavailable or fails for any reason.
 */
async function computeCompatibility(listing, profile) {
  const llmResult = await llmScore(listing, profile);
  if (llmResult) return llmResult;
  return ruleBasedScore(listing, profile);
}

module.exports = { computeCompatibility, ruleBasedScore, llmScore };
