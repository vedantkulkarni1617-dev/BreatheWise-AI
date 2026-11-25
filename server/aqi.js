
/*
  BreatheWise AI
  Indian National AQI calculation engine
  Based on CPCB breakpoint methodology.
*/

const BREAKPOINTS = {
  PM25: [
    [0, 30, 0, 50],
    [30, 60, 50, 100],
    [60, 90, 100, 200],
    [90, 120, 200, 300],
    [120, 250, 300, 400],
    [250, Infinity, 400, 500]
  ],

  PM10: [
    [0, 50, 0, 50],
    [50, 100, 50, 100],
    [100, 250, 100, 200],
    [250, 350, 200, 300],
    [350, 430, 300, 400],
    [430, Infinity, 400, 500]
  ],

  NO2: [
    [0, 40, 0, 50],
    [40, 80, 50, 100],
    [80, 180, 100, 200],
    [180, 280, 200, 300],
    [280, 400, 300, 400],
    [400, Infinity, 400, 500]
  ],

  O3: [
    [0, 50, 0, 50],
    [50, 100, 50, 100],
    [100, 168, 100, 200],
    [168, 208, 200, 300],
    [208, 748, 300, 400],
    [748, Infinity, 400, 500]
  ],

  CO: [
    [0, 1, 0, 50],
    [1, 2, 50, 100],
    [2, 10, 100, 200],
    [10, 17, 200, 300],
    [17, 34, 300, 400],
    [34, Infinity, 400, 500]
  ],

  SO2: [
    [0, 40, 0, 50],
    [40, 80, 50, 100],
    [80, 380, 100, 200],
    [380, 800, 200, 300],
    [800, 1600, 300, 400],
    [1600, Infinity, 400, 500]
  ],

  NH3: [
    [0, 200, 0, 50],
    [200, 400, 50, 100],
    [400, 800, 100, 200],
    [800, 1200, 200, 300],
    [1200, 1800, 300, 400],
    [1800, Infinity, 400, 500]
  ],

  Pb: [
    [0, 0.5, 0, 50],
    [0.5, 1, 50, 100],
    [1, 2, 100, 200],
    [2, 3, 200, 300],
    [3, 3.5, 300, 400],
    [3.5, Infinity, 400, 500]
  ]
};

const POLLUTANT_ALIASES = {
  "PM2.5": "PM25",
  PM25: "PM25",
  "PM10": "PM10",
  NO2: "NO2",
  OZONE: "O3",
  O3: "O3",
  CO: "CO",
  SO2: "SO2",
  NH3: "NH3",
  PB: "Pb"
};

export function calculateSubIndex(pollutant, concentration) {
  const key = POLLUTANT_ALIASES[
    String(pollutant).toUpperCase()
  ];

  if (!key || !Number.isFinite(concentration) || concentration < 0) {
    return null;
  }

  const ranges = BREAKPOINTS[key];

  const range = ranges.find(
    ([low, high]) =>
      concentration >= low && concentration <= high
  );

  if (!range) return null;

  const [bpLow, bpHigh, indexLow, indexHigh] = range;

  if (bpHigh === Infinity) return 500;

  const index =
    ((indexHigh - indexLow) / (bpHigh - bpLow)) *
      (concentration - bpLow) +
    indexLow;

  return Math.min(500, Math.max(0, Math.floor(index)));
}

export function calculateNationalAQI(observations = []) {
  const valid = observations.filter((item) => {
    const pollutant = POLLUTANT_ALIASES[
      String(item.pollutant).toUpperCase()
    ];

    if (!pollutant) return false;

    if (!Number.isFinite(item.concentration)) return false;

    if (item.concentration < 0) return false;

    if (!Number.isFinite(item.validHours) || item.validHours < 16) {
      return false;
    }

    const requiredPeriod =
      pollutant === "CO" || pollutant === "O3" ? 8 : 24;

    return item.averagingPeriod === requiredPeriod;
  });

  const subIndices = valid.map((item) => ({
    pollutant: item.pollutant,
    value: calculateSubIndex(
      item.pollutant,
      item.concentration
    )
  })).filter((item) => item.value !== null);

  const hasParticulate = subIndices.some(
    (item) => ["PM2.5", "PM25", "PM10"].includes(
      String(item.pollutant).toUpperCase()
    )
  );

  if (subIndices.length < 3 || !hasParticulate) {
    return {
      available: false,
      aqi: null,
      category: "Insufficient data",
      subIndices,
      reason:
        "CPCB requires at least three valid pollutant sub-indices, including PM2.5 or PM10."
    };
  }

  const worst = subIndices.reduce((a, b) =>
    a.value >= b.value ? a : b
  );

  const categories = [
    { max: 50, name: "Good" },
    { max: 100, name: "Satisfactory" },
    { max: 200, name: "Moderately Polluted" },
    { max: 300, name: "Poor" },
    { max: 400, name: "Very Poor" },
    { max: 500, name: "Severe" }
  ];

  return {
    available: true,
    aqi: worst.value,
    category: categories.find(
      (item) => worst.value <= item.max
    )?.name,
    dominantPollutant: worst.pollutant,
    subIndices
  };
}
