export const LOCATIONS = {
  coimbatore: {
    slug: "coimbatore",
    displayName: "Engine Frame Studios Coimbatore",
    placeId: "ChIJW-q9SapZqDsRwLVIKuUmJlA",
    googleMapsUrl: "https://www.google.com/maps/place/Engine+Frame+Studios+Coimbatore/@10.9688862,77.0067706,17z/data=!3m1!4b1!4m6!3m5!1s0x3ba859aa49bdea5b:0x502626e52a48b5c0!8m2!3d10.9688862!4d77.0067706",
  },
  madurai: {
    slug: "madurai",
    displayName: "Engine Frame Studios Madurai",
    placeId: "ChIJMytPPMjPADsRKjjsgNJrkng",
    googleMapsUrl: "https://www.google.com/maps/place/Engine+Frame+Studios/@9.9077312,78.1031306,17z/data=!3m1!4b1!4m6!3m5!1s0x3b00cfc83c4f2b33:0x78926bd280ec382a!8m2!3d9.9077312!4d78.1031306",
  },
};

export const STORED_REVIEWS_CAP = 30;

export const writeReviewUrl = (placeId) =>
  `https://search.google.com/local/writereview?placeid=${placeId}`;
