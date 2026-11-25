
import { useState, useEffect } from "react";
import "./App.css";

const Icon = ({ name, size = 20 }) => {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    wind: <><path d="M3 8h12a3 3 0 1 0-3-3"/><path d="M2 12h17a3 3 0 1 1-3 3"/><path d="M4 16h6"/></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m7 14 4-4 4 4 6-7"/></>,
    house: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1Z"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z"/></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z"/><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
    arrow: <><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    leaf: <><path d="M20 4c-9 0-15 4-15 11a5 5 0 0 0 5 5c7 0 11-6 10-16Z"/><path d="M5 20c3-5 6-7 11-10"/></>
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.spark}
    </svg>
  );
};

const navigation = [
  { name: "Overview", icon: "grid" },
  { name: "Air Quality", icon: "wind" },
  { name: "Family Protection", icon: "shield" },
  { name: "Analytics", icon: "chart" },
  { name: "Indoor Air", icon: "house" }
];

function App() {
  const [active, setActive] = useState("Overview");
  const [location, setLocation] = useState("Pimpri-Chinchwad");
  const [question, setQuestion] = useState("");
  const [family, setFamily] = useState("Family with children");
  const [mobileMenu, setMobileMenu] = useState(false);
const [messages, setMessages] = useState([]);
const [isLoading, setIsLoading] = useState(false);
const [assistantError, setAssistantError] = useState("");
const [airQuality, setAirQuality] = useState(null);
const [airQualityLoading, setAirQualityLoading] = useState(true);
const [airQualityError, setAirQualityError] = useState("");
const [selectedStation, setSelectedStation] = useState("");

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

useEffect(() => {
  const fetchAirQuality = async () => {
    try {
      setAirQualityLoading(true);
      setAirQualityError("");

      const response = await fetch(
        `${API_BASE}/api/air-quality?city=Pimpri-Chinchwad`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to retrieve CPCB data.");
      }

      setAirQuality(data);

      const firstStation = data.records?.find(
        (record) => record.average !== null && record.station
      );

      if (firstStation) {
        setSelectedStation(firstStation.station);
      }
    } catch (error) {
      console.error("CPCB error:", error);
      setAirQualityError(error.message);
    } finally {
      setAirQualityLoading(false);
    }
  };

  fetchAirQuality();
}, []);

const stationNames = [
  ...new Set(
    (airQuality?.records || [])
      .map((record) => record.station)
      .filter(Boolean)
  )
].sort();

const stationRecords = (airQuality?.records || []).filter(
  (record) => record.station === selectedStation
);

const getPollutantValue = (pollutant) => {
  const record = stationRecords.find(
    (item) => item.pollutant?.toUpperCase() === pollutant
  );

  return record?.average ?? null;
};

const formatReading = (value) =>
  value === null || value === undefined
    ? "--"
    : Number(value).toFixed(1);

const handleAsk = async (e) => {
  e.preventDefault();

  const userQuestion = question.trim();

  if (!userQuestion || isLoading) return;

  // Display the user's message
  setMessages((prev) => [
    ...prev,
    { role: "user", text: userQuestion }
  ]);

  setQuestion("");
  setIsLoading(true);
  setAssistantError("");

  try {
    const response = await fetch(
      "http://localhost:5000/api/assistant",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: userQuestion,
          location,
          family
        })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || "Unable to connect to BreatheWise AI."
      );
    }

    // Display Gemini's actual response
    setMessages((prev) => [
      ...prev,
      { role: "assistant", text: data.answer }
    ]);

  } catch (error) {
    console.error("BreatheWise AI error:", error);

    setAssistantError(
      error.message || "Something went wrong. Please try again."
    );

  } finally {
    setIsLoading(false);
  }
};


  return (
    <div className="app-shell">

      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-symbol">
            <Icon name="wind" size={25} />
          </div>
          <div>
            <h2>BreatheWise<span>AI</span></h2>
            <small>ENVIRONMENTAL INTELLIGENCE</small>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <nav>
          {navigation.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${active === item.name ? "active" : ""}`}
              onClick={() => {
                setActive(item.name);
                setMobileMenu(false);
              }}
            >
              <Icon name={item.icon} />
              <span>{item.name}</span>
              {active === item.name && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-icon"><Icon name="spark" /></div>
            <h3>Smarter living starts here.</h3>
            <p>Turn environmental data into everyday decisions.</p>
          </div>

          <button className="nav-item settings-item"
            onClick={() => setActive("Settings")}>
            <Icon name="settings" />
            <span>Settings</span>
          </button>

          <div className="user-profile">
            <div className="user-avatar">BW</div>
            <div>
              <b>My Family</b>
              <small>Personal workspace</small>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>

      <main className="main-content">

        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setMobileMenu(!mobileMenu)}>
              <Icon name="menu" />
            </button>
            <div>
              <span className="breadcrumb">Workspace / </span>
              <b>{active}</b>
            </div>
          </div>

          <div className="topbar-right">
            <div className="system-status">
              <span /> SYSTEM PREVIEW
            </div>
            <div className="top-avatar">V</div>
          </div>
        </header>

        <div className="page-content">

          <section className="welcome-section">
            <div>
              <span className="eyebrow">
                <Icon name="spark" size={14} /> YOUR PERSONAL AIR INTELLIGENCE
              </span>
              <h1>Good day. <span>Breathe better.</span></h1>
              <p>Your family's health begins with understanding the air around you.</p>
            </div>

            <div className="location-selector">
              <Icon name="pin" />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                aria-label="Monitoring location"
              />
            </div>
          </section>

          <section className="aqi-hero">
            <div className="aqi-main">
              <div className="aqi-label">
                <span className="live-indicator" />
                AIR QUALITY OVERVIEW
                <span className="demo-label">SAMPLE DATA</span>
              </div>

              <div className="aqi-reading">
                <strong>156</strong>
                <div>
                  <span className="aqi-condition">Unhealthy</span>
                  <p>Illustrative AQI reading</p>
                </div>
              </div>

              <p className="aqi-description">
                This is demonstration data. Connect a verified monitoring
                provider to receive actual air quality measurements.
              </p>

              <div className="aqi-footer">
                <span><Icon name="pin" size={14} /> {location}</span>
                <span><Icon name="clock" size={14} /> Awaiting live connection</span>
              </div>
            </div>

            <div className="aqi-visual">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="orbit orbit-three" />
              <div className="visual-core">
                <Icon name="wind" size={65} />
              </div>
              <div className="visual-caption">AIR INTELLIGENCE</div>
            </div>
          </section>


<section className="section-block">
  <div className="section-heading">
    <div>
      <span className="eyebrow">
        OFFICIAL ENVIRONMENTAL MONITORING
      </span>
      <h2>Pollutant breakdown</h2>
    </div>

    <span className="data-tag">
      CPCB / DATA.GOV.IN
    </span>
  </div>

  {airQualityLoading && (
    <p>Retrieving official monitoring readings...</p>
  )}

  {airQualityError && (
    <div className="assistant-error" role="alert">
      {airQualityError}
    </div>
  )}

  {!airQualityLoading && airQuality && (
    <>
      <div className="station-selector">
        <label htmlFor="monitoring-station">
          MONITORING STATION
        </label>

        <select
          id="monitoring-station"
          value={selectedStation}
          onChange={(e) => setSelectedStation(e.target.value)}
        >
          {stationNames.map((station) => (
            <option key={station} value={station}>
              {station}
            </option>
          ))}
        </select>
      </div>

      <p className="station-update">
        Source: CPCB / Government of India ·
        {` ${stationRecords.length} pollutant records`}
      </p>

      <div className="pollutant-grid">
        {[
          { name: "PM2.5", unit: "µg/m³" },
          { name: "PM10", unit: "µg/m³" },
          { name: "NO₂", unit: "µg/m³" },
          { name: "O₃", unit: "µg/m³" },
          { name: "SO₂", unit: "µg/m³" },
          { name: "CO", unit: "mg/m³" },
          { name: "NH₃", unit: "µg/m³" }
        ].map((item) => {
          const pollutantKey = item.name
            .replace("₂", "2")
            .replace("₃", "3");

          const value = getPollutantValue(pollutantKey);

          return (
            <article
              className="pollutant-card"
              key={item.name}
            >
              <div className="pollutant-top">
                <span>{item.name}</span>
              </div>

              <div className="pollutant-value">
                {formatReading(value)}
              </div>

              <small>
                {value !== null
                  ? item.unit
                  : "No reading reported"}
              </small>

              <span className="pollutant-status">
                {value !== null
                  ? "Official station reading"
                  : "Awaiting measurement"}
              </span>
            </article>
          );
        })}
      </div>

      <p className="station-update">
        Last reported update: {
          stationRecords.find((r) => r.lastUpdated)?.lastUpdated
          || "Not available"
        }
      </p>
    </>
  )}
</section>


            

          <section className="lower-grid">

            <article className="panel routine-panel">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">EVERYDAY WELLNESS</span>
                  <h2>Your daily protection plan</h2>
                </div>
                <Icon name="shield" size={22} />
              </div>

              <div className="routine-list">
                {[
                  { time: "MORNING", title: "Check before stepping out", desc: "Review verified outdoor air readings before planning activities.", icon: "sun" },
                  { time: "AFTERNOON", title: "Choose cleaner activities", desc: "Consider indoor exercise when outdoor pollution is elevated.", icon: "wind" },
                  { time: "EVENING", title: "Improve indoor comfort", desc: "Ventilate when outdoor air quality is suitable.", icon: "house" }
                ].map((item) => (
                  <div className="routine-row" key={item.time}>
                    <div className="routine-icon"><Icon name={item.icon} /></div>
                    <div className="routine-copy">
                      <span>{item.time}</span>
                      <h3>{item.title}</h3>
                      <p>{item.desc}</p>
                    </div>
                    <Icon name="arrow" size={17} />
                  </div>
                ))}
              </div>
            </article>

            <article className="panel family-panel">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">PERSONALIZED CARE</span>
                  <h2>Family protection</h2>
                </div>
                <Icon name="shield" size={22} />
              </div>

              <label htmlFor="family">WHO ARE WE PROTECTING?</label>
              <select
                id="family"
                value={family}
                onChange={(e) => setFamily(e.target.value)}
              >
                <option>Adults</option>
                <option>Family with children</option>
                <option>Family with elderly members</option>
                <option>Children and elderly members</option>
              </select>

              <div className="family-insight">
                <div className="family-insight-icon"><Icon name="leaf" size={25} /></div>
                <div>
                  <b>Your protection profile</b>
                  <p>{family}</p>
                </div>
              </div>

              <div className="family-note">
                <Icon name="shield" size={17} />
                Personalized recommendations will be generated after connecting Gemini AI.
              </div>
            </article>

          </section>


<section className="assistant-panel panel">

  <div className="assistant-heading">
    <div className="assistant-icon">
      <Icon name="spark" size={25} />
    </div>

    <div>
      <span className="eyebrow">
        YOUR INTELLIGENT COMPANION
      </span>
      <h2>Ask BreatheWise AI</h2>
      <p>
        Get practical guidance for cleaner everyday living.
      </p>
    </div>

    <span className="gemini-tag">
      GEMINI · CONNECTED
    </span>
  </div>

  {/* Conversation history */}
  {messages.length > 0 && (
    <div className="assistant-messages" aria-live="polite">
      {messages.map((message, index) => (
        <div
          className={`chat-message ${message.role}`}
          key={index}
        >
          <span className="chat-role">
            {message.role === "user"
              ? "YOU"
              : "BREATHEWISE AI"}
          </span>

          <p>{message.text}</p>
        </div>
      ))}

      {isLoading && (
        <div className="chat-message assistant">
          <span className="chat-role">
            BREATHEWISE AI
          </span>
          <p className="assistant-loading">
            Analyzing your question...
          </p>
        </div>
      )}
    </div>
  )}

  {/* Error handling */}
  {assistantError && (
    <div className="assistant-error" role="alert">
      {assistantError}
    </div>
  )}

  {/* Suggested questions */}
  <div className="assistant-suggestions">
    {[
      "How do I reduce indoor pollution?",
      "Create a family smog safety routine",
      "What does PM2.5 mean?"
    ].map((item) => (
      <button
        key={item}
        type="button"
        onClick={() => setQuestion(item)}
        disabled={isLoading}
      >
        {item}
        <Icon name="arrow" size={14} />
      </button>
    ))}
  </div>

  {/* AI input */}
  <form
    className="assistant-input"
    onSubmit={handleAsk}
  >
    <input
      value={question}
      onChange={(e) => setQuestion(e.target.value)}
      placeholder="Ask anything about air quality..."
      disabled={isLoading}
      aria-label="Ask BreatheWise AI"
    />

    <button
      type="submit"
      disabled={!question.trim() || isLoading}
      aria-label="Send message"
    >
      <Icon name="send" />
    </button>
  </form>

</section>


          <footer className="footer">
            <div><Icon name="wind" size={17} /> BreatheWise AI</div>
            <span>Smarter air. Healthier living.</span>
            <span>Environmental intelligence platform · Preview</span>
          </footer>

        </div>
      </main>
    </div>
  );
}

export default App;
