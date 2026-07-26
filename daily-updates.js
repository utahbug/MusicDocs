(() => {
  const feeds = {
    news: {
      title: "Utah News",
      sources: [
        {
          title: "Governor's News",
          description: "State announcements and news releases.",
          url: "https://governor.utah.gov/press/"
        },
        {
          title: "Utah Legislature",
          description: "Bills, calendars, meetings, and live streams.",
          url: "https://le.utah.gov/"
        },
        {
          title: "Utah Public Notices",
          description: "Government meetings, agendas, and notices.",
          url: "https://www.utah.gov/pmn/search.html"
        },
        {
          title: "Utah Courts News",
          description: "Court news releases and media advisories.",
          url: "https://www.utcourts.gov/en/media/media.html"
        }
      ]
    },
    traffic: {
      title: "Utah Traffic",
      sources: [
        {
          title: "UDOT Live Map",
          description: "Incidents, congestion, construction, and cameras.",
          url: "https://www.udottraffic.utah.gov/map"
        },
        {
          title: "UDOT Traffic Alerts",
          description: "Closures and major travel alerts.",
          url: "https://www.udottraffic.utah.gov/List/Alerts"
        },
        {
          title: "Road Conditions",
          description: "Current highway and weather conditions.",
          url: "https://www.udottraffic.utah.gov/roadconditions"
        },
        {
          title: "UTA Service Alerts",
          description: "Bus, TRAX, and FrontRunner disruptions.",
          url: "https://rideuta.com/Rider-Info/Service-Alerts"
        }
      ]
    },
    weather: {
      title: "Utah Weather",
      sources: [
        {
          title: "NWS Salt Lake City",
          description: "Forecasts for most of Utah.",
          url: "https://www.weather.gov/slc/"
        },
        {
          title: "NWS Grand Junction",
          description: "Forecasts for eastern Utah.",
          url: "https://www.weather.gov/gjt/"
        },
        {
          title: "Utah Weather Radar",
          description: "Northern and southern Utah radar.",
          url: "https://www.weather.gov/slc/radar"
        },
        {
          title: "Utah Air Quality",
          description: "Current conditions by county.",
          url: "https://air.utah.gov/"
        }
      ]
    }
  };

  const buttons = Array.from(document.querySelectorAll("[data-daily-feed]"));
  const shell = document.querySelector(".daily-feed-shell");
  const title = document.getElementById("daily-feed-title");
  const sourceList = document.getElementById("official-source-list");
  const weatherFeed = document.getElementById("weather-feed");
  const weatherStatus = document.getElementById("weather-feed-status");
  const weatherList = document.getElementById("weather-alert-list");
  let weatherLoaded = false;

  if (!buttons.length || !shell || !title || !sourceList || !weatherFeed) return;

  function renderSources(config) {
    const cards = config.sources.map((source) => {
      const link = document.createElement("a");
      const heading = document.createElement("strong");
      const description = document.createElement("span");
      const label = document.createElement("small");

      link.className = "official-source-card";
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noopener";
      heading.textContent = source.title;
      description.textContent = source.description;
      label.textContent = "Official source";
      link.append(heading, description, label);
      return link;
    });
    sourceList.replaceChildren(...cards);
  }

  function addWeatherAlert(properties) {
    const item = document.createElement("li");
    const event = document.createElement("strong");
    const area = document.createElement("span");
    event.textContent = properties.event || "Weather alert";
    area.textContent = properties.areaDesc || properties.headline || "Utah";
    item.append(event, area);
    weatherList.append(item);
  }

  async function loadWeather() {
    if (weatherLoaded) return;
    weatherLoaded = true;
    weatherStatus.textContent = "Loading active Utah weather alerts\u2026";
    weatherList.replaceChildren();

    try {
      const response = await fetch("https://api.weather.gov/alerts/active?area=UT", {
        headers: { Accept: "application/geo+json" }
      });
      if (!response.ok) throw new Error("Weather service unavailable");
      const data = await response.json();
      const alerts = Array.isArray(data.features) ? data.features.slice(0, 6) : [];
      if (!alerts.length) {
        weatherStatus.textContent = "No active statewide National Weather Service alerts.";
        return;
      }
      weatherStatus.textContent = `${alerts.length} active Utah alert${alerts.length === 1 ? "" : "s"}:`;
      alerts.forEach((alert) => addWeatherAlert(alert.properties || {}));
    } catch {
      weatherStatus.textContent = "Weather alerts could not be loaded. Use an official forecast source above.";
    }
  }

  function selectFeed(key, updateHash = true) {
    const selected = key === "traffic" || key === "weather" ? key : "news";
    const config = feeds[selected];
    buttons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.dailyFeed === selected));
    });
    if (updateHash) history.replaceState(null, "", `#${selected}`);
    title.textContent = config.title;
    weatherFeed.hidden = selected !== "weather";
    renderSources(config);
    if (selected === "weather") loadWeather();
    shell.setAttribute("aria-busy", "false");
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => selectFeed(button.dataset.dailyFeed));
  });
  window.addEventListener("hashchange", () => selectFeed(location.hash.slice(1), false));
  selectFeed(location.hash.slice(1), false);
})();
