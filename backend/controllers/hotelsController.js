import axios from "axios";
import supabase from "../config/supabase.js";

const normalizeGoogleHotel = (hotelData) => ({
  hotel_id: hotelData.place_id ? String(hotelData.place_id) : null,
  place_id: hotelData.place_id ? String(hotelData.place_id) : null,
  hotel_name: hotelData.name || "Unnamed hotel",
  address: hotelData.vicinity || hotelData.formatted_address || "",
  rating: Number(hotelData.rating || 0),
  price_per_night: 0,
  contact_no: "",
  gpay_id: "",
  hotel_url: "",
  hotel_details: "",
  photo_reference: hotelData.photos?.[0]?.photo_reference || null,
  lat: hotelData.geometry?.location?.lat || null,
  lng: hotelData.geometry?.location?.lng || null,
});

const makeAdminHotelId = (hotelName) => {
  const base =
    String(hotelName || "hotel")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "hotel";

  return `admin_${Date.now()}_${base}`;
};

const toTrimmedString = (value) => String(value || "").trim();

const readRequestField = (body, keys, fallback = "") => {
  const keyList = Array.isArray(keys) ? keys : [keys];

  for (const key of keyList) {
    const rawValue = body?.[key];

    if (Array.isArray(rawValue)) {
      const firstValue = rawValue.find(
        (entry) => entry !== undefined && entry !== null && String(entry).trim() !== "",
      );
      if (firstValue !== undefined) {
        return firstValue;
      }
      continue;
    }

    if (
      rawValue !== undefined &&
      rawValue !== null &&
      String(rawValue).trim() !== ""
    ) {
      return rawValue;
    }
  }

  return fallback;
};

const parseIntegerPricePerNight = (value) => {
  if (value === "" || value === null || value === undefined) {
    return { isValid: false, amount: 0 };
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return { isValid: false, amount: 0 };
  }

  return {
    isValid: true,
    amount: Math.trunc(numericValue),
  };
};

const buildAdminHotelAddress = ({
  local_address,
  state,
  pin_code,
  country,
  address,
}) => {
  const addressParts = [local_address, state, pin_code, country]
    .map(toTrimmedString)
    .filter(Boolean);

  if (addressParts.length > 0) {
    return addressParts.join(", ");
  }

  return toTrimmedString(address);
};

const isMissingOptionalHotelColumnError = (error) => {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  const isColumnMismatch =
    code === "PGRST204" ||
    code === "42703" ||
    code === "42883" ||
    message.includes("schema cache") ||
    message.includes("column");

  return (
    isColumnMismatch &&
    [
      "created_by",
      "hotel_image_url",
      "full_address",
      "local_address",
      "state",
      "pin_code",
      "country",
      "gpay_id",
    ].some((columnName) => message.includes(columnName))
  );
};

const isMissingFullAddressFieldInTriggerError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return message.includes('record "new" has no field "full_address"');
};

const isMissingColumnError = (error, columnName) => {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  const normalizedColumnName = String(columnName || "").toLowerCase();

  if (!normalizedColumnName) {
    return false;
  }

  const isColumnMismatch =
    code === "PGRST204" ||
    code === "42703" ||
    code === "42883" ||
    message.includes("schema cache") ||
    message.includes("column");

  return isColumnMismatch && message.includes(normalizedColumnName);
};

const isMissingCreatedByColumnError = (error) =>
  isMissingColumnError(error, "created_by");
const isMissingContactNoColumnError = (error) =>
  isMissingColumnError(error, "contact_no");
const isMissingGpayIdColumnError = (error) =>
  isMissingColumnError(error, "gpay_id");

const isSchemaMismatchError = (error) => {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();

  return (
    code === "PGRST204" ||
    code === "42703" ||
    code === "42883" ||
    message.includes("schema cache") ||
    message.includes("column") ||
    message.includes("operator does not exist")
  );
};

const isMissingReviewReplyTableError = (error) => {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();

  return code === "42P01" || message.includes("review_reply");
};

const normalizeSearchText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const parseLocationQuery = ({ address, state, country }) => {
  const addressParts = String(address || "")
    .split(",")
    .map((part) => normalizeSearchText(part))
    .filter(Boolean);

  const searchCountry =
    normalizeSearchText(country) || addressParts[addressParts.length - 1] || "";
  const locationTerms = [
    normalizeSearchText(state),
    ...addressParts.slice(0, -1),
  ].filter(Boolean);

  return {
    country: searchCountry,
    terms: [...new Set(locationTerms)],
  };
};

const hotelMatchesLocation = (hotel, location) => {
  const searchCountry = normalizeSearchText(location?.country);
  const terms = Array.isArray(location?.terms) ? location.terms : [];

  if (!searchCountry) {
    return false;
  }

  const hotelLocationBlob = [
    hotel?.hotel_name,
    hotel?.state,
    hotel?.country,
    hotel?.address,
    hotel?.full_address,
    hotel?.local_address,
  ]
    .map(normalizeSearchText)
    .filter(Boolean)
    .join(" ");

  const countryMatch = hotelLocationBlob.includes(searchCountry);

  if (!countryMatch) {
    return false;
  }

  if (terms.length === 0) {
    return true;
  }

  return terms.some((term) => hotelLocationBlob.includes(term));
};

const fetchReviewRepliesMap = async (reviewIds) => {
  if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from("review_reply")
    .select(
      "reply_id, review_id, hotel_id, admin_user_id, reply_text, created_at",
    )
    .in("review_id", reviewIds)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingReviewReplyTableError(error)) {
      return {};
    }

    throw error;
  }

  return (data || []).reduce((acc, reply) => {
    const reviewId = reply.review_id;
    if (!reviewId) {
      return acc;
    }

    if (!acc[reviewId]) {
      acc[reviewId] = [];
    }

    acc[reviewId].push(reply);
    return acc;
  }, {});
};

const saveHotel = async (hotelData) => {
  const normalizedHotel = normalizeGoogleHotel(hotelData);
  if (!normalizedHotel.hotel_id) {
return null;
  }

  const payload = {
    hotel_id: normalizedHotel.hotel_id,
    hotel_name: normalizedHotel.hotel_name,
    address: normalizedHotel.address,
    rating: normalizedHotel.rating,
  };

  const { data, error } = await supabase
    .from("Hotel_Master")
    .upsert(payload, { onConflict: "hotel_id" })
    .select("*")
    .single();

  if (error) {
    return null;
  }
  return {
    ...normalizedHotel,
    ...data,
    lat: normalizedHotel.lat,
    lng: normalizedHotel.lng,
  };
};

// GET nearby hotels from Google Places and save them
export const getNearbyHotels = async (req, res) => {
  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res
      .status(400)
      .json({ error: "Latitude and longitude are required." });
  }

  if (!GOOGLE_PLACES_API_KEY) {
    return res
      .status(500)
      .json({ error: "GOOGLE_PLACES_API_KEY is missing on the backend." });
  }

  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
      {
        params: {
          location: `${lat},${lng}`,
          radius: 5000,
          type: "lodging",
          key: GOOGLE_PLACES_API_KEY,
        },
      },
    );
    const googleStatus = response.data.status;
    const places = response.data.results || [];

    if (googleStatus === "REQUEST_DENIED") {
      return res.status(403).json({
        error:
          "Google Places API request was denied. Check your API key and billing.",
      });
    }

    if (googleStatus === "INVALID_REQUEST") {
      return res
        .status(400)
        .json({ error: "Invalid request sent to Google Places API." });
    }

    if (googleStatus === "ZERO_RESULTS") {
      return res.json([]);
    }

    if (googleStatus !== "OK") {
      return res
        .status(500)
        .json({ error: `Unexpected Google API status: ${googleStatus}` });
    }

    const normalizedHotels = places.map(normalizeGoogleHotel);

    const savedHotels = await Promise.all(
      places.map((hotel) => saveHotel(hotel)),
    );
    const responseHotels = normalizedHotels.map((hotel, index) => {
      const savedHotel = savedHotels[index];

      if (savedHotel === null) {
        return hotel;
      }

      return {
        ...hotel,
        ...savedHotel,
        lat: hotel.lat,
        lng: hotel.lng,
      };
    });

    res.json(responseHotels);
  } catch (error) {
    console.error(
      "[getNearbyHotels] Error fetching nearby hotels from Google:",
      error.message,
    );
    res.status(500).json({
      error: "Server error while fetching nearby hotels.",
      details: error.message,
    });
  }
};

// GET all hotels from our database
export const getAllHotels = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data: userBookings, error: bookingError } = await supabase
      .from("booking_details")
      .select("hotel_id")
      .eq("user_id", userId);

    if (bookingError) {
      throw bookingError;
    }

    const userHotelIds = [
      ...new Set(
        (userBookings || [])
          .map((b) => String(b.hotel_id).trim())
          .filter(Boolean),
      ),
    ];

    if (userHotelIds.length === 0) {
      return res.json([]);
    }

    const { data, error } = await supabase
      .from("Hotel_Master")
      .select("*")
      .in("hotel_id", userHotelIds);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// POST a new hotel to our database
export const createHotel = async (req, res) => {
  const { place_id, hotel_name, address, rating = 0 } = req.body;

  if (!place_id || !hotel_name || !address) {
    return res.status(400).json({
      success: false,
      error: "place_id, hotel_name and address are required.",
    });
  }

  try {
    const hotelId = String(place_id).trim();

    const payload = {
      hotel_id: hotelId,
      hotel_name: String(hotel_name).trim(),
      address: String(address).trim(),
      rating: Number(rating) || 0,
    };

    const { data, error } = await supabase
      .from("Hotel_Master")
      .upsert(payload, { onConflict: "hotel_id" })
      .select("*")
      .single();

    if (error) {
      console.error("[createHotel] Supabase upsert error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to save hotel.",
        details: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Hotel saved successfully.",
      mapped_hotel_id: hotelId,
      hotel: data,
    });
  } catch (err) {
    console.error("[createHotel] Unexpected error:", err);
    return res.status(500).json({
      success: false,
      error: "Server error while saving hotel.",
      details: err.message,
    });
  }
};

// GET reviews for a specific hotel
export const getHotelReviews = async (req, res) => {
  const { hotelId } = req.params;

  if (!hotelId) {
    return res.status(400).json({ error: "hotelId is required." });
  }

  try {
    const { data, error } = await supabase
      .from("review_master")
      .select(
        "review_id, hotel_id, user_id, user_email, comment, star, created_at",
      )
      .eq("hotel_id", String(hotelId).trim())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getHotelReviews] Supabase query error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch hotel reviews.",
        details: error.message,
      });
    }

    const reviewIds = (data || [])
      .map((review) => review.review_id)
      .filter(Boolean);
    const replyMap = await fetchReviewRepliesMap(reviewIds);
    const reviewsWithReplies = (data || []).map((review) => ({
      ...review,
      admin_replies: replyMap[review.review_id] || [],
    }));

    return res.status(200).json({
      success: true,
      reviews: reviewsWithReplies,
    });
  } catch (err) {
    console.error("[getHotelReviews] Unexpected error:", err);
    return res.status(500).json({
      success: false,
      error: "Server error while fetching reviews.",
      details: err.message,
    });
  }
};

const ensureHotelExistsForReview = async ({
  hotelId,
  hotelName,
  address,
  rating,
}) => {
  const { data: existingHotel, error: existingHotelError } = await supabase
    .from("Hotel_Master")
    .select("hotel_id")
    .eq("hotel_id", hotelId)
    .maybeSingle();

  if (existingHotelError) {
    throw existingHotelError;
  }

  if (existingHotel) {
    return;
  }

  if (!hotelName || !address) {
    const missingHotelError = new Error(
      "Hotel record is missing. Include hotel_name and address when submitting a review.",
    );
    missingHotelError.statusCode = 400;
    throw missingHotelError;
  }

  const payload = {
    hotel_id: hotelId,
    hotel_name: String(hotelName).trim().slice(0, 255),
    address: String(address).trim().slice(0, 500),
    rating: Number.isFinite(Number(rating)) ? Number(rating) : 0,
  };

  const { error } = await supabase
    .from("Hotel_Master")
    .upsert(payload, { onConflict: "hotel_id" })
    .select("hotel_id")
    .single();

  if (error) {
    throw error;
  }
};

const recomputeAndUpdateHotelRating = async (hotelId) => {
  const normalizedHotelId = String(hotelId || "").trim();
  if (!normalizedHotelId) {
    return null;
  }

  const { data: reviews, error: reviewsError } = await supabase
    .from("review_master")
    .select("star")
    .eq("hotel_id", normalizedHotelId);

  if (reviewsError) {
    throw reviewsError;
  }

  const stars = (reviews || [])
    .map((review) => Number(review?.star))
    .filter((value) => Number.isFinite(value) && value >= 1 && value <= 5);

  const averageRating = stars.length
    ? Number(
        (stars.reduce((sum, value) => sum + value, 0) / stars.length).toFixed(
          1,
        ),
      )
    : 0;

  const { error: updateError } = await supabase
    .from("Hotel_Master")
    .update({ rating: averageRating })
    .eq("hotel_id", normalizedHotelId);

  if (updateError) {
    throw updateError;
  }

  return averageRating;
};

// POST a review (comment + star) for a specific hotel
export const createHotelReview = async (req, res) => {
  const userId = req.user?.id;
  const userEmail = req.user?.email || null;
  const { hotelId } = req.params;
  const { comment, star, hotel_name: hotelName, address, rating } = req.body;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const normalizedHotelId = String(hotelId || "").trim();

  if (!normalizedHotelId) {
    return res
      .status(400)
      .json({ success: false, error: "hotelId is required." });
  }

  const sanitizedComment = String(comment || "").trim();
  const numericStar = Number(star);

  if (!sanitizedComment) {
    return res
      .status(400)
      .json({ success: false, error: "comment is required." });
  }

  if (!Number.isFinite(numericStar) || numericStar < 1 || numericStar > 5) {
    return res.status(400).json({
      success: false,
      error: "star must be a number between 1 and 5.",
    });
  }

  try {
    await ensureHotelExistsForReview({
      hotelId: normalizedHotelId,
      hotelName: String(hotelName || "").trim(),
      address: String(address || "").trim(),
      rating,
    });

    const payload = {
      hotel_id: normalizedHotelId,
      user_id: userId,
      user_email: userEmail,
      comment: sanitizedComment,
      star: Math.round(numericStar),
    };

    const { data, error } = await supabase
      .from("review_master")
      .insert(payload)
      .select(
        "review_id, hotel_id, user_id, user_email, comment, star, created_at",
      )
      .single();

    if (error) {
      console.error("[createHotelReview] Supabase insert error:", error);

      if (error.code === "22001") {
        return res.status(400).json({
          success: false,
          error:
            "Schema mismatch for hotel_id column. Ensure hotel_id is TEXT in hotel/review/booking tables.",
          details: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: "Failed to save review.",
        details: error.message,
      });
    }

    let updatedHotelRating = null;
    try {
      updatedHotelRating =
        await recomputeAndUpdateHotelRating(normalizedHotelId);
    } catch (ratingError) {
      console.error(
        "[createHotelReview] Failed to recompute hotel rating:",
        ratingError,
      );
    }

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully.",
      review: data,
      hotel_rating: updatedHotelRating,
    });
  } catch (err) {
    console.error("[createHotelReview] Unexpected error:", err);

    if (err?.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        error: err.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: "Server error while submitting review.",
      details: err.message,
    });
  }
};

export const getAdminHotels = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  try {
    let { data, error } = await supabase
      .from("Hotel_Master")
      .select("*")
      .eq("created_by", userId)
      .order("hotel_id", { ascending: false });

    if (error) {
      const fallbackResult = await supabase
        .from("Hotel_Master")
        .select("*")
        .order("hotel_id", { ascending: false });

      data = (fallbackResult.data || []).filter((hotel) =>
        String(hotel?.hotel_id || "").startsWith("admin_"),
      );
      error = fallbackResult.error;
    }

    if (error) {
      console.error("[getAdminHotels] Supabase query error:", error);

      if (isSchemaMismatchError(error)) {
        return res.status(200).json({
          success: true,
          hotels: [],
          warning:
            "Hotel schema mismatch detected. Returning empty admin hotels list.",
        });
      }

      return res.status(500).json({
        success: false,
        error: "Failed to fetch admin hotels.",
        details: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      hotels: data || [],
    });
  } catch (err) {
    console.error("[getAdminHotels] Unexpected error:", err);
    return res.status(500).json({
      success: false,
      error: "Server error while fetching admin hotels.",
      details: err.message,
    });
  }
};

export const getAdminHotelsForUsers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("Hotel_Master")
      .select("*")
      .order("hotel_id", { ascending: false });

    if (error) {
      console.error("[getAdminHotelsForUsers] Supabase query error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch admin-added hotels.",
        details: error.message,
      });
    }

    const location = parseLocationQuery(req.query || {});
    const hotels = (data || [])
      .filter((hotel) => String(hotel?.hotel_id || "").startsWith("admin_"))
      .filter((hotel) => hotelMatchesLocation(hotel, location));

    return res.status(200).json({
      success: true,
      hotels,
    });
  } catch (err) {
    console.error("[getAdminHotelsForUsers] Unexpected error:", err);
    return res.status(500).json({
      success: false,
      error: "Server error while fetching admin-added hotels.",
      details: err.message,
    });
  }
};

export const createAdminHotel = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const hotel_name = readRequestField(req.body, "hotel_name", "");
  const hotel_url = readRequestField(req.body, "hotel_url", "");
  const hotel_details = readRequestField(req.body, "hotel_details", "");
  const address = readRequestField(req.body, "address", "");
  const local_address = readRequestField(req.body, "local_address", "");
  const state = readRequestField(req.body, "state", "");
  const pin_code = readRequestField(req.body, "pin_code", "");
  const country = readRequestField(req.body, "country", "");
  const hotel_image_url = readRequestField(req.body, "hotel_image_url", "");
  const rawPricePerNight = readRequestField(
    req.body,
    ["price_per_night", "pricePerNight", "price"],
    "",
  );
  const contact_no = readRequestField(req.body, ["contact_no", "contactNo"], "");
  const gpay_id = readRequestField(req.body, ["gpay_id", "gpayId"], "");
  const trimmedName = String(hotel_name || "").trim();
  const trimmedUrl = String(hotel_url || "").trim();
  const trimmedDetails = String(hotel_details || "").trim();
  const trimmedAddress = buildAdminHotelAddress({
    local_address,
    state,
    pin_code,
    country,
    address,
  });
  const trimmedLocalAddress = toTrimmedString(local_address);
  const trimmedState = toTrimmedString(state);
  const trimmedPinCode = toTrimmedString(pin_code);
  const trimmedCountry = toTrimmedString(country);
  const trimmedContactNo = toTrimmedString(contact_no);
  const trimmedGpayId = toTrimmedString(gpay_id);
  const parsedPrice = parseIntegerPricePerNight(rawPricePerNight);

  const uploadedImagePath = req.file?.path ? String(req.file.path).trim() : "";
  if (req.file && !uploadedImagePath) {
    return res.status(500).json({
      success: false,
      error: "Image upload did not return a valid Cloudinary URL.",
    });
  }
  const trimmedImageUrl =
    uploadedImagePath || String(hotel_image_url || "").trim();

  if (!trimmedName) {
    return res.status(400).json({
      success: false,
      error: "hotel_name is required.",
    });
  }

  if (!parsedPrice.isValid) {
    return res.status(400).json({
      success: false,
      error: "price_per_night must be a valid non-negative number.",
    });
  }

  if (parsedPrice.amount === undefined || parsedPrice.amount === null) {
    parsedPrice.amount = 0;
  }

  const payload = {
    hotel_id: makeAdminHotelId(trimmedName),
    hotel_name: trimmedName,
    address: trimmedAddress || "Not provided",
    full_address: trimmedAddress || "Not provided",
    rating: 0,
    hotel_url: trimmedUrl,
    hotel_details: trimmedDetails,
    price_per_night: parsedPrice.amount,
    contact_no: trimmedContactNo,
    gpay_id: trimmedGpayId,
    local_address: trimmedLocalAddress,
    state: trimmedState,
    pin_code: trimmedPinCode,
    country: trimmedCountry,
    hotel_image_url: trimmedImageUrl,
    created_by: userId,
  };

  try {
    let { data, error } = await supabase
      .from("Hotel_Master")
      .insert(payload)
      .select("*")
      .single();

    if (isMissingOptionalHotelColumnError(error)) {
      const fallbackPayload = {
        hotel_id: payload.hotel_id,
        hotel_name: payload.hotel_name,
        address: payload.address,
        full_address: payload.full_address,
        rating: payload.rating,
        hotel_url: payload.hotel_url,
        hotel_details: payload.hotel_details,
        price_per_night: payload.price_per_night,
        contact_no: payload.contact_no,
        gpay_id: payload.gpay_id,
      };

      if (isMissingColumnError(error, "full_address")) {
        delete fallbackPayload.full_address;
      }

      if (isMissingContactNoColumnError(error)) {
        delete fallbackPayload.contact_no;
      }

      if (isMissingGpayIdColumnError(error)) {
        delete fallbackPayload.gpay_id;
      }

      if (!isMissingCreatedByColumnError(error)) {
        fallbackPayload.created_by = payload.created_by;
      }

      const fallbackResult = await supabase
        .from("Hotel_Master")
        .insert(fallbackPayload)
        .select("*")
        .single();

      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      console.error("[createAdminHotel] Supabase insert error:", error);

      if (isMissingFullAddressFieldInTriggerError(error)) {
        return res.status(500).json({
          success: false,
          error:
            "Hotel schema is missing full_address column required by a DB trigger.",
          details:
            "Run: ALTER TABLE \"Hotel_Master\" ADD COLUMN IF NOT EXISTS full_address VARCHAR(500) DEFAULT '';",
        });
      }

      const detailParts = [error?.message, error?.details, error?.hint]
        .filter((part) => String(part || "").trim())
        .map((part) => String(part).trim());

      return res.status(500).json({
        success: false,
        error: "Failed to save admin hotel.",
        details: detailParts.join(" | ") || "Unknown database error.",
      });
    }

    const { data: updatedHotel, error: updatePriceError } = await supabase
      .from("Hotel_Master")
      .update({ price_per_night: parsedPrice.amount })
      .eq("hotel_id", payload.hotel_id)
      .select("*")
      .single();

    if (updatePriceError) {
    } else {
      data = updatedHotel;
    }

    return res.status(201).json({
      success: true,
      message: "Hotel added successfully.",
      hotel: data,
    });
  } catch (err) {
    console.error("[createAdminHotel] Unexpected error:", err);
    return res.status(500).json({
      success: false,
      error: "Server error while saving admin hotel.",
      details: err.message,
    });
  }
};

export const deleteAdminHotel = async (req, res) => {
  const userId = req.user?.id;
  const hotelId = String(req.params?.hotelId || "").trim();

  if (!userId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  if (!hotelId) {
    return res
      .status(400)
      .json({ success: false, error: "hotelId is required." });
  }

  if (!hotelId.startsWith("admin_")) {
    return res.status(400).json({
      success: false,
      error: "Only admin-created hotels can be deleted here.",
    });
  }

  try {
    let hotelRecord = null;
    let canValidateOwner = true;

    const ownerLookup = await supabase
      .from("Hotel_Master")
      .select("hotel_id, created_by")
      .eq("hotel_id", hotelId)
      .maybeSingle();

    if (ownerLookup.error && isMissingCreatedByColumnError(ownerLookup.error)) {
      canValidateOwner = false;
      const fallbackLookup = await supabase
        .from("Hotel_Master")
        .select("hotel_id")
        .eq("hotel_id", hotelId)
        .maybeSingle();

      if (fallbackLookup.error) {
        return res.status(500).json({
          success: false,
          error: "Failed to validate hotel before deletion.",
          details: fallbackLookup.error.message,
        });
      }

      hotelRecord = fallbackLookup.data;
    } else if (ownerLookup.error) {
      return res.status(500).json({
        success: false,
        error: "Failed to validate hotel before deletion.",
        details: ownerLookup.error.message,
      });
    } else {
      hotelRecord = ownerLookup.data;
    }

    if (!hotelRecord) {
      return res
        .status(404)
        .json({ success: false, error: "Hotel not found." });
    }

    if (
      canValidateOwner &&
      hotelRecord.created_by &&
      String(hotelRecord.created_by) !== String(userId)
    ) {
      return res.status(403).json({
        success: false,
        error: "You can delete only hotels created by you.",
      });
    }
    let deleteQuery = supabase
      .from("Hotel_Master")
      .delete()
      .eq("hotel_id", hotelId);

    if (canValidateOwner) {
      deleteQuery = deleteQuery.eq("created_by", userId);
    }

    const { error: deleteError } = await deleteQuery;

    if (deleteError) {
      return res.status(500).json({
        success: false,
        error: "Failed to delete hotel.",
        details: deleteError.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Hotel deleted successfully.",
      hotel_id: hotelId,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Server error while deleting hotel.",
      details: err.message,
    });
  }
};

export const createAdminReviewReply = async (req, res) => {
  const adminUserId = req.user?.id;
  const { hotelId, reviewId } = req.params;
  const { reply_text: replyText } = req.body || {};

  if (!adminUserId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const normalizedHotelId = String(hotelId || "").trim();
  const normalizedReviewId = String(reviewId || "").trim();
  const sanitizedReply = String(replyText || "").trim();

  if (!normalizedHotelId || !normalizedReviewId) {
    return res
      .status(400)
      .json({ success: false, error: "hotelId and reviewId are required." });
  }

  if (!sanitizedReply) {
    return res
      .status(400)
      .json({ success: false, error: "reply_text is required." });
  }

  try {
    const { data: reviewRecord, error: reviewError } = await supabase
      .from("review_master")
      .select("review_id, hotel_id")
      .eq("review_id", normalizedReviewId)
      .eq("hotel_id", normalizedHotelId)
      .maybeSingle();

    if (reviewError) {
      return res.status(500).json({
        success: false,
        error: "Failed to validate review for reply.",
        details: reviewError.message,
      });
    }

    if (!reviewRecord) {
      return res.status(404).json({
        success: false,
        error: "Review not found for the selected hotel.",
      });
    }

    const insertPayload = {
      review_id: normalizedReviewId,
      hotel_id: normalizedHotelId,
      admin_user_id: adminUserId,
      reply_text: sanitizedReply,
    };

    const { data, error } = await supabase
      .from("review_reply")
      .insert(insertPayload)
      .select(
        "reply_id, review_id, hotel_id, admin_user_id, reply_text, created_at",
      )
      .single();

    if (error) {
      if (isMissingReviewReplyTableError(error)) {
        return res.status(400).json({
          success: false,
          error:
            "review_reply table is missing. Run the SQL migration for admin replies.",
          details: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: "Failed to save admin reply.",
        details: error.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Reply added successfully.",
      reply: data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Server error while saving admin reply.",
      details: err.message,
    });
  }
};
