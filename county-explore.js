(() => {
  "use strict";

  const mount = document.getElementById("countyExploreContent");
  if (!mount) return;

  const countyFacts = {
    "Beaver": { area: 2582.912, census2020: 7072, population2024: 7424, stateParks: [] },
    "Box Elder": { area: 5781.304, census2020: 57666, population2024: 64120, stateParks: ["Willard Bay State Park"] },
    "Cache": { area: 1164.687, census2020: 133154, population2024: 145487, stateParks: ["Hyrum Lake State Park"] },
    "Carbon": { area: 1479.343, census2020: 20412, population2024: 20613, stateParks: ["Scofield State Park"] },
    "Daggett": { area: 696.515, census2020: 935, population2024: 956, stateParks: [] },
    "Davis": { area: 324.753, census2020: 362679, population2024: 378470, stateParks: ["Antelope Island State Park", "Jordan River OHV State Park"] },
    "Duchesne": { area: 3235.523, census2020: 19596, population2024: 20803, stateParks: ["Fred Hayes State Park at Starvation"] },
    "Emery": { area: 4462.635, census2020: 9825, population2024: 10161, stateParks: ["Goblin Valley State Park", "Green River State Park", "Huntington State Park", "Millsite State Park"], nationalParks: ["Capitol Reef National Park"] },
    "Garfield": { area: 5179.556, census2020: 5083, population2024: 5290, stateParks: ["Anasazi State Park Museum", "Escalante Petrified Forest State Park", "Kodachrome Basin State Park"], nationalParks: ["Bryce Canyon National Park", "Canyonlands National Park", "Capitol Reef National Park"] },
    "Grand": { area: 3672.858, census2020: 9669, population2024: 9788, stateParks: ["Dead Horse Point State Park", "Utahraptor State Park"], nationalParks: ["Arches National Park", "Canyonlands National Park"] },
    "Iron": { area: 3296.167, census2020: 57289, population2024: 65936, stateParks: ["Frontier Homestead State Park Museum"], nationalParks: ["Zion National Park"] },
    "Juab": { area: 3391.812, census2020: 11786, population2024: 13297, stateParks: ["Yuba State Park"] },
    "Kane": { area: 3994.140, census2020: 7667, population2024: 8525, stateParks: ["Coral Pink Sand Dunes State Park", "Kodachrome Basin State Park"], nationalParks: ["Bryce Canyon National Park", "Zion National Park"] },
    "Millard": { area: 6785.482, census2020: 12975, population2024: 13572, stateParks: ["Territorial Statehouse State Park Museum"] },
    "Morgan": { area: 609.197, census2020: 12295, population2024: 13093, stateParks: ["East Canyon State Park", "Lost Creek State Park"] },
    "Piute": { area: 758.210, census2020: 1438, population2024: 1534, stateParks: ["Otter Creek State Park", "Piute State Park"] },
    "Rich": { area: 1028.758, census2020: 2510, population2024: 2752, stateParks: ["Bear Lake State Park"] },
    "Salt Lake": { area: 752.852, census2020: 1185238, population2024: 1216274, stateParks: ["Great Salt Lake State Park", "Jordan River OHV State Park", "This Is The Place Heritage Park"] },
    "San Juan": { area: 7823.765, census2020: 14518, population2024: 14601, stateParks: ["Dead Horse Point State Park", "Edge of the Cedars State Park Museum", "Goosenecks State Park"], nationalParks: ["Canyonlands National Park"] },
    "Sanpete": { area: 1589.816, census2020: 28437, population2024: 30732, stateParks: ["Palisade State Park", "Yuba State Park"] },
    "Sevier": { area: 1910.476, census2020: 21522, population2024: 22520, stateParks: ["Fremont Indian State Park and Museum"], nationalParks: ["Capitol Reef National Park"] },
    "Summit": { area: 1870.674, census2020: 42357, population2024: 43109, stateParks: ["Echo State Park", "Historic Union Pacific Rail Trail State Park", "Rockport State Park"] },
    "Tooele": { area: 7040.271, census2020: 72698, population2024: 84488, stateParks: [] },
    "Uintah": { area: 4482.881, census2020: 35620, population2024: 38307, stateParks: ["Red Fleet State Park", "Steinaker State Park", "Utah Field House of Natural History State Park Museum"] },
    "Utah": { area: 2004.460, census2020: 659399, population2024: 747234, stateParks: ["Camp Floyd State Park Museum", "Flight Park State Recreation Area", "Scofield State Park", "Utah Lake State Park"] },
    "Wasatch": { area: 1176.952, census2020: 34788, population2024: 37858, stateParks: ["Deer Creek State Park", "Jordanelle State Park", "Wasatch Mountain State Park"] },
    "Washington": { area: 2427.589, census2020: 180279, population2024: 207943, stateParks: ["Gunlock State Park", "Quail Creek State Park", "Sand Hollow State Park", "Snow Canyon State Park"], nationalParks: ["Zion National Park"] },
    "Wayne": { area: 2461.094, census2020: 2486, population2024: 2608, stateParks: [], nationalParks: ["Canyonlands National Park", "Capitol Reef National Park"] },
    "Weber": { area: 611.023, census2020: 262223, population2024: 276118, stateParks: ["Willard Bay State Park"] },
  };

  const countyCardPalette = [
    { tint: "#edf5e8", accent: "#9fbd88", detail: "#f7faf5" },
    { tint: "#e8f3f2", accent: "#79aaa5", detail: "#f5faf9" },
    { tint: "#fbf3e3", accent: "#d2aa62", detail: "#fdf9f1" },
    { tint: "#f3edf8", accent: "#aa8fc2", detail: "#faf7fc" },
  ];

  const countySeats = {
    "Beaver": "Beaver",
    "Box Elder": "Brigham City",
    "Cache": "Logan",
    "Carbon": "Price",
    "Daggett": "Manila",
    "Davis": "Farmington",
    "Duchesne": "Duchesne",
    "Emery": "Castle Dale",
    "Garfield": "Panguitch",
    "Grand": "Moab",
    "Iron": "Parowan",
    "Juab": "Nephi",
    "Kane": "Kanab",
    "Millard": "Fillmore",
    "Morgan": "Morgan",
    "Piute": "Junction",
    "Rich": "Randolph",
    "Salt Lake": "Salt Lake City",
    "San Juan": "Monticello",
    "Sanpete": "Manti",
    "Sevier": "Richfield",
    "Summit": "Coalville",
    "Tooele": "Tooele",
    "Uintah": "Vernal",
    "Utah": "Provo",
    "Wasatch": "Heber City",
    "Washington": "St. George",
    "Wayne": "Loa",
    "Weber": "Ogden",
  };

  function bindStatehoodToggle() {
    const button = document.getElementById("statehoodCountiesToggle");
    const list = document.getElementById("statehoodCountyList");
    if (!button || !list) return;

    button.addEventListener("click", () => {
      const willOpen = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(willOpen));
      list.hidden = !willOpen;
    });
  }

  function enhanceCountyHistory(counties) {
    const historyList = mount.querySelector(".county-history-list");
    const sortBy = document.getElementById("countySortBy");
    const sortDirection = document.getElementById("countySortDirection");
    if (!historyList || !sortBy || !sortDirection) return;

    const historyItems = [...historyList.children];
    const chronologicalItems = [...historyItems];
    const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 });
    const countyByName = new Map(counties.map((county) => [county.name, county]));
    let openButton = null;
    let layoutFrame = 0;

    historyList.classList.add("is-masonry");

    function layoutCountyCards() {
      cancelAnimationFrame(layoutFrame);
      layoutFrame = requestAnimationFrame(() => {
        const items = [...historyList.children];
        if (window.matchMedia("(max-width: 700px)").matches) {
          items.forEach((item) => {
            item.style.removeProperty("left");
            item.style.removeProperty("top");
            item.style.removeProperty("width");
          });
          historyList.style.removeProperty("height");
          return;
        }

        const columnGap = 28;
        const rowGap = 10;
        const columnWidth = (historyList.clientWidth - columnGap) / 2;
        const columnHeights = [0, 0];

        items.forEach((item, index) => {
          const column = index % 2;
          item.style.width = `${columnWidth}px`;
          item.style.left = `${column * (columnWidth + columnGap)}px`;
          item.style.top = `${columnHeights[column]}px`;
          columnHeights[column] += item.offsetHeight + rowGap;
        });

        historyList.style.height = `${Math.max(...columnHeights) - rowGap}px`;
      });
    }

    historyItems.forEach((item, index) => {
      const match = item.textContent.match(/(?:\u2014|-)\s+(.+?) County/);
      if (!match) return;

      const countyName = match[1].trim();
      const facts = countyFacts[countyName];
      const county = countyByName.get(countyName);
      if (!facts || !county) return;

      item.dataset.countyName = countyName;
      item.dataset.creationDate = item.querySelector("time")?.dateTime || "";
      item.dataset.area = String(facts.area);
      item.dataset.population = String(facts.population2024);

      const palette = countyCardPalette[index % countyCardPalette.length];
      item.style.setProperty("--card-tint", palette.tint);
      item.style.setProperty("--card-accent", palette.accent);
      item.style.setProperty("--card-detail", palette.detail);

      const summary = document.createElement("span");
      summary.className = "county-card-summary";
      while (item.firstChild) summary.append(item.firstChild);

      const chevron = document.createElement("span");
      chevron.className = "county-card-chevron";
      chevron.setAttribute("aria-hidden", "true");
      chevron.textContent = "⌄";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "county-history-toggle";
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-controls", `explore-county-detail-${index}`);
      button.append(summary, chevron);

      const detail = document.createElement("div");
      detail.className = "county-detail";
      detail.id = `explore-county-detail-${index}`;
      detail.hidden = true;

      const stateParks = facts.stateParks.length ? facts.stateParks.join("; ") : "None";
      const nationalParks = facts.nationalParks?.length ? facts.nationalParks.join("; ") : "None";
      detail.innerHTML = `
        <dl class="county-detail-grid">
          <div><dt>County</dt><dd>${county.name} County</dd></div>
          <div><dt>County seat</dt><dd>${county.seat}</dd></div>
          <div><dt>Land area</dt><dd>${numberFormatter.format(facts.area)} square miles</dd></div>
          <div><dt>2020 Census population</dt><dd>${numberFormatter.format(facts.census2020)} <small>(redistricting count)</small></dd></div>
          <div><dt>2024 population estimate</dt><dd>${numberFormatter.format(facts.population2024)} <small>(July 1, 2024)</small></dd></div>
          <div class="park-detail"><dt>Utah state parks</dt><dd>${stateParks}</dd></div>
          <div class="park-detail"><dt>National parks</dt><dd>${nationalParks}</dd></div>
        </dl>
      `;

      button.addEventListener("click", () => {
        const willOpen = button.getAttribute("aria-expanded") !== "true";
        if (openButton && openButton !== button) {
          openButton.setAttribute("aria-expanded", "false");
          document.getElementById(openButton.getAttribute("aria-controls")).hidden = true;
        }
        button.setAttribute("aria-expanded", String(willOpen));
        detail.hidden = !willOpen;
        openButton = willOpen ? button : null;
        layoutCountyCards();
      });

      item.append(button, detail);
    });

    const directionLabels = {
      creation: { asc: "Oldest first", desc: "Newest first" },
      name: { asc: "A–Z", desc: "Z–A" },
      area: { asc: "Smallest first", desc: "Largest first" },
      population: { asc: "Smallest first", desc: "Largest first" },
    };

    function updateDirectionLabels(resetToAscending = false) {
      const selectedDirection = resetToAscending ? "asc" : sortDirection.value;
      const labels = directionLabels[sortBy.value];
      sortDirection.replaceChildren(
        ...Object.entries(labels).map(([value, label]) => {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = label;
          return option;
        })
      );
      sortDirection.value = selectedDirection;
    }

    function sortCountyCards() {
      const category = sortBy.value;
      const direction = sortDirection.value === "desc" ? -1 : 1;
      const orderedItems = [...chronologicalItems].sort((a, b) => {
        let comparison = 0;
        if (category === "name") {
          comparison = a.dataset.countyName.localeCompare(b.dataset.countyName);
        } else if (category === "creation") {
          comparison = a.dataset.creationDate.localeCompare(b.dataset.creationDate);
        } else {
          comparison = Number(a.dataset[category]) - Number(b.dataset[category]);
        }
        return comparison * direction;
      });
      orderedItems.forEach((item) => historyList.append(item));
      layoutCountyCards();
    }

    sortBy.addEventListener("change", () => {
      updateDirectionLabels(true);
      sortCountyCards();
    });
    sortDirection.addEventListener("change", sortCountyCards);
    window.addEventListener("resize", layoutCountyCards);
    layoutCountyCards();
  }

  const counties = Object.entries(countySeats).map(([name, seat]) => ({ name, seat }));
  bindStatehoodToggle();
  enhanceCountyHistory(counties);
})();
