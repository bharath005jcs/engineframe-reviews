const PLACES_API_BASE = "https://places.googleapis.com/v1/places";
const FIELD_MASK = "displayName,rating,userRatingCount,reviews";

export async function fetchPlace(placeId, apiKey) {
  const url = `${PLACES_API_BASE}/${encodeURIComponent(placeId)}`;
  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places API ${res.status}: ${body}`);
  }

  const data = await res.json();
  return normalizePlace(data);
}

function normalizePlace(raw) {
  return {
    displayName: raw.displayName?.text ?? "",
    rating: raw.rating ?? null,
    userRatingCount: raw.userRatingCount ?? 0,
    reviews: (raw.reviews ?? []).map(normalizeReview),
  };
}

function normalizeReview(r) {
  return {
    reviewId: r.name ?? null,
    author: r.authorAttribution?.displayName ?? "Anonymous",
    avatarUrl: r.authorAttribution?.photoUri ?? null,
    authorUrl: r.authorAttribution?.uri ?? null,
    rating: r.rating ?? 0,
    text: r.text?.text ?? r.originalText?.text ?? "",
    publishTime: r.publishTime ?? null,
    relativeTime: r.relativePublishTimeDescription ?? "",
  };
}
