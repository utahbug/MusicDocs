(() => {
  const feeds = {
    news: {
      title: "Utah News",
      listId: "1064307421659619328",
      url: "https://x.com/i/lists/1064307421659619328",
      fallback: "Open the Utah News list on X"
    },
    traffic: {
      title: "Traffic & Weather Updates",
      listId: "1065680931980115973",
      url: "https://x.com/i/lists/1065680931980115973",
      fallback: "Open the Traffic & Weather list on X"
    }
  };

  const buttons = Array.from(document.querySelectorAll("[data-daily-feed]"));
  const shell = document.querySelector(".daily-feed-shell");
  const title = document.getElementById("daily-feed-title");
  const sourceLink = document.getElementById("daily-feed-source");
  const xHost = document.getElementById("x-feed-host");
  const weatherFeed = document.getElementById("weather-feed");
  const weatherStatus = document.getElementById("weather-feed-status");
  const weatherList = document.getElementById("weather-alert-list");
  let renderToken = 0;
  let weatherLoaded = false;

  if (!buttons.length || !shell || !title || !xHost || !weatherFeed) return;

  function waitForXWidget() {
    return new Promise((resolve) => {
      let attempts = 0;
      const check = () => {
        if (window.twttr?.widgets?.createTimeline) {
          resolve(window.twttr);
          return;
        }
        attempts += 1;
        if (attempts >= 50) {
          resolve(null);
          return;
        }
        window.setTimeout(check, 100);
      };
      check();
    });
  }

  function makeFallback(config, message) {
    const status = document.createElement("p");
    status.className = "x-feed-status";
    status.textContent = message;

    const link = document.createElement("a");
    link.className = "x-feed-fallback";
    link.href = config.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = config.fallback;

    xHost.replaceChildren(status, link);
    return { status, link };
  }

  async function showXFeed(key) {
    const config = feeds[key];
    const token = ++renderToken;
    weatherFeed.hidden = true;
    xHost.hidden = false;
    title.textContent = config.title;
    sourceLink.hidden = false;
    sourceLink.href = key === "traffic"
      ? "https://www.udottraffic.utah.gov/map"
      : "https://utahnewsdispatch.com/";
    sourceLink.textContent = key === "traffic" ? "UDOT Traffic" : "Utah News Dispatch";
    shell.setAttribute("aria-busy", "true");

    const fallback = makeFallback(config, `Loading ${config.title}…`);
    const twitter = await waitForXWidget();
    if (token !== renderToken) return;

    if (!twitter) {
      fallback.status.textContent = "The live X feed could not load here.";
      shell.setAttribute("aria-busy", "false");
      return;
    }

    try {
      const timeline = await twitter.widgets.createTimeline(
        { sourceType: "list", id: config.listId },
        xHost,
        { height: 680, theme: "light", dnt: true }
      );
      if (token !== renderToken) {
        timeline?.remove();
        return;
      }
      if (timeline) {
        fallback.status.remove();
        fallback.link.remove();
      } else {
        fallback.status.textContent = "The live X feed could not load here.";
      }
    } catch {
      fallback.status.textContent = "The live X feed could not load here.";
    }
    shell.setAttribute("aria-busy", "false");
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
    weatherStatus.textContent = "Loading active Utah weather alerts…";
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
      weatherStatus.textContent = "Weather alerts could not be loaded. Use the official forecast link below.";
    }
  }

  function showWeather() {
    renderToken += 1;
    xHost.hidden = true;
    xHost.replaceChildren();
    weatherFeed.hidden = false;
    title.textContent = "Utah Weather";
    sourceLink.hidden = false;
    sourceLink.href = "https://www.weather.gov/slc/";
    sourceLink.textContent = "Official Weather";
    shell.setAttribute("aria-busy", "false");
    loadWeather();
  }

  function selectFeed(key, updateHash = true) {
    const selected = key === "traffic" || key === "weather" ? key : "news";
    buttons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.dailyFeed === selected));
    });
    if (updateHash) history.replaceState(null, "", `#${selected}`);
    if (selected === "weather") showWeather();
    else showXFeed(selected);
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => selectFeed(button.dataset.dailyFeed));
  });
  window.addEventListener("hashchange", () => selectFeed(location.hash.slice(1), false));
  selectFeed(location.hash.slice(1), false);
})();
