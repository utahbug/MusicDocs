const htmlEscapeMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
};

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => htmlEscapeMap[character]);
}

function addImageFallback(slot) {
  const image = slot.querySelector("img");
  if (!image) return;
  image.addEventListener("error", () => {
    const media = image.closest(".state-media");
    if (media) media.textContent = "Image unavailable";
  }, { once: true });
}

const historyStorageKey = "utahbug-history-cards-v1";
const historyDefaultColors = ["#dceee7", "#f4e6b7", "#f1d1c0", "#d9eaf2"];

function readHistoryEdits() {
  try {
    const saved = JSON.parse(localStorage.getItem(historyStorageKey) || "null");
    return Array.isArray(saved) ? saved : null;
  } catch {
    return null;
  }
}

const historyCards = document.querySelectorAll(".history-page .reveal-card");
const savedHistoryCards = readHistoryEdits();
if (savedHistoryCards) {
  historyCards.forEach((card, index) => {
    const saved = savedHistoryCards[index];
    if (!saved) return;
    const prompt = card.querySelector(".prompt");
    if (prompt && saved.prompt) prompt.textContent = saved.prompt;
    if (saved.answer) card.dataset.answer = saved.answer;
    if (saved.color) card.style.setProperty("--history-background", saved.color);
  });
}

const historyRotator = document.querySelector(".history-rotator");
if (historyRotator && historyCards.length) {
  const scenes = [
    {
      src: "../assets/history/pioneer-wagon-people-v3.png",
      alt: "Pioneers traveling with a horse-drawn covered wagon",
      caption: "Pioneer wagon travel",
      className: "history-wagon",
    },
    {
      src: "../assets/history/pioneer-handcart-people-v3.png",
      alt: "Pioneers pulling and pushing an uncovered handcart",
      caption: "Handcart travel",
      className: "history-handcart",
    },
    {
      src: "../assets/history/pioneer-cabin-lived-in-v2.png",
      alt: "A lived-in pioneer cabin scene with a family, sagebrush, and a rabbit",
      caption: "Daily life at a pioneer cabin",
      className: "history-cabin",
    },
    {
      src: "../assets/history/golden-spike-railroad-simple-v2.png",
      alt: "A worker driving the Golden Spike between two locomotives",
      caption: "",
      className: "history-railroad",
    },
    {
      src: "../assets/history/jim-bridger.png",
      alt: "Jim Bridger studying a route map beside his pack horse",
      caption: "Jim Bridger and Utah’s mountain-man era",
      className: "history-bridger",
    },
    {
      src: "../assets/history/utah-rocket-workers.png",
      alt: "Utah aerospace workers assembling and inspecting a solid rocket motor segment",
      caption: "Utah workers building Space Shuttle solid rocket motors",
      className: "history-rocket",
    },
  ];
  const placementIndexes = [2, 6, 9];
  const sceneGroups = [
    scenes.filter((scene) => ["history-wagon", "history-handcart", "history-cabin"].includes(scene.className)),
    scenes.filter((scene) => ["history-bridger", "history-railroad"].includes(scene.className)),
    scenes.filter((scene) => scene.className === "history-rocket"),
  ];
  const selectedScenes = sceneGroups.map(
    (group) => group[Math.floor(Math.random() * group.length)]
  );

  selectedScenes.forEach((scene, index) => {
    const figure = index === 0 ? historyRotator : historyRotator.cloneNode(true);
    const image = figure.querySelector("img");

    figure.className = `history-illustration history-rotator ${scene.className}`;
    image.src = scene.src;
    image.alt = scene.alt;
    historyCards[placementIndexes[index]].after(figure);
  });
}

document.querySelectorAll(".reveal-card").forEach((button) => {
  const isHistoryCard = Boolean(button.closest(".history-page"));
  button.addEventListener("click", () => {
    const answer = button.dataset.answer || "";
    const note = button.dataset.note || "";
    const answerSlot = button.querySelector(".answer");
    const answerText = note ? answer + " - " + note : answer;

    if (!isHistoryCard) {
      const showing = button.classList.toggle("is-revealed");
      answerSlot.textContent = showing ? answerText : "Tap to reveal";
      return;
    }

    const showing = button.classList.toggle("is-revealed");
    button.setAttribute("aria-pressed", String(showing));
    button.setAttribute(
      "aria-label",
      showing
        ? button.dataset.prompt + ": " + answerText + ". Flip card to hide answer."
        : button.dataset.prompt + " Flip card to reveal answer."
    );
    button.querySelector(".card-front").setAttribute("aria-hidden", String(showing));
    button.querySelector(".card-back").setAttribute("aria-hidden", String(!showing));
  });

  if (isHistoryCard) {
    const prompt = button.querySelector(".prompt");
    const answerSlot = button.querySelector(".answer");
    const promptText = prompt.textContent.trim();
    const answer = button.dataset.answer || "";
    const note = button.dataset.note || "";
    const answerText = note ? answer + " - " + note : answer;
    const inner = document.createElement("span");
    const front = document.createElement("span");
    const back = document.createElement("span");
    const backPrompt = prompt.cloneNode(true);

    button.dataset.prompt = promptText;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", promptText + " Flip card to reveal answer.");
    inner.className = "card-inner";
    front.className = "card-face card-front";
    back.className = "card-face card-back";
    backPrompt.classList.add("back-prompt");
    front.setAttribute("aria-hidden", "false");
    back.setAttribute("aria-hidden", "true");
    answerSlot.textContent = answerText;
    front.append(prompt);
    back.append(backPrompt, answerSlot);
    inner.append(front, back);
    button.replaceChildren(inner);
  }
});

const quizDirectoryCards = Array.from(document.querySelectorAll(".quiz-page .directory-card"));
const quizNavigationMotions = quizDirectoryCards.map((_, index) => {
  if (quizDirectoryCards.length >= 6 && index === quizDirectoryCards.length - 1) return "pulse";
  if (quizDirectoryCards.length >= 3 && index === quizDirectoryCards.length - 2) return "slide";
  return "press";
});

for (let index = quizNavigationMotions.length - 1; index > 0; index -= 1) {
  const randomIndex = Math.floor(Math.random() * (index + 1));
  [quizNavigationMotions[index], quizNavigationMotions[randomIndex]] =
    [quizNavigationMotions[randomIndex], quizNavigationMotions[index]];
}

quizDirectoryCards.forEach((card, index) => {
  const motion = quizNavigationMotions[index];

  card.dataset.navMotion = motion;

  card.addEventListener("click", (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    if (card.classList.contains("is-navigating")) {
      event.preventDefault();
      return;
    }

    const destination = card.href;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    event.preventDefault();
    card.classList.add("is-navigating");
    const duration = motion === "press" ? 210 : motion === "slide" ? 240 : 260;
    window.setTimeout(() => {
      window.location.href = destination;
    }, duration);
  });
});

const historyEditorList = document.querySelector(".history-editor-list");
if (historyEditorList) {
  const historyDefaults = [
    ["When did Utah become a state?", "January 4, 1896"],
    ["What was the name of the territory before statehood?", "Utah Territory"],
    ["What provisional state name is tied to early Utah history?", "Deseret"],
    ["Where was the first transcontinental railroad completed?", "Promontory Summit, Utah"],
    ["What year was the Golden Spike ceremony?", "1869"],
    ["Which building was Utah's territorial capitol?", "Territorial Statehouse in Fillmore"],
    ["Which lake helped shape early settlement and travel in northern Utah?", "Great Salt Lake"],
    ["What group founded Salt Lake City in 1847?", "Mormon pioneers / Latter-day Saint pioneers"],
    ["What Utah symbol connects to the idea of industry?", "The beehive"],
    ["Which Utah city was once the territorial capital?", "Fillmore"],
    ["What ancient cultures left cliff dwellings, artifacts, and rock art in Utah?", "Ancestral Puebloan and Fremont cultures"],
    ["Which Utah site preserves the Last Spike story?", "Golden Spike National Historical Park"],
  ];
  const saved = readHistoryEdits();

  historyDefaults.forEach(([defaultPrompt, defaultAnswer], index) => {
    const values = saved?.[index] || {};
    const card = document.createElement("article");
    card.className = "history-editor-card";
    card.innerHTML =
      '<div class="editor-card-heading"><strong>Card ' + (index + 1) + '</strong>' +
      '<label>Color <input class="editor-color" type="color" value="' +
      escapeHtml(values.color || historyDefaultColors[index % historyDefaultColors.length]) +
      '"></label></div>' +
      '<label>Question<textarea class="editor-prompt" rows="2">' +
      escapeHtml(values.prompt || defaultPrompt) +
      '</textarea></label>' +
      '<label>Answer<textarea class="editor-answer" rows="2">' +
      escapeHtml(values.answer || defaultAnswer) +
      '</textarea></label>';
    historyEditorList.append(card);
  });

  const status = document.querySelector(".editor-status");
  document.querySelector(".editor-save").addEventListener("click", () => {
    const edits = Array.from(historyEditorList.querySelectorAll(".history-editor-card")).map((card) => ({
      prompt: card.querySelector(".editor-prompt").value.trim(),
      answer: card.querySelector(".editor-answer").value.trim(),
      color: card.querySelector(".editor-color").value,
    }));
    localStorage.setItem(historyStorageKey, JSON.stringify(edits));
    status.textContent = "Changes saved.";
  });

  document.querySelector(".editor-reset").addEventListener("click", () => {
    localStorage.removeItem(historyStorageKey);
    window.location.reload();
  });
}

function resetStateCard(card) {
  const slot = card.querySelector(".state-stage");
  const surface = card.querySelector(".state-cycle-surface");
  card.dataset.stage = "0";
  card.classList.remove("is-active", "territory-expanded", "stage-capital", "stage-map", "stage-close-map", "stage-flag", "stage-facts", "stage-compare", "stage-all");
  if (slot) slot.textContent = "";
  if (surface) surface.setAttribute("aria-label", "Show " + (card.dataset.name || "state") + " details");
}

const stateProtectedPlaces = {
  Alabama: [0, 3, "Audemus jura nostra defendere"], Alaska: [8, 5, "North to the Future"],
  Arizona: [3, 19, "Ditat Deus"], Arkansas: [1, 0, "Regnat populus"],
  California: [9, 20, "Eureka"], Colorado: [4, 9, "Nil sine numine"],
  Connecticut: [0, 0, "Qui transtulit sustinet"], Delaware: [0, 0, "Liberty and Independence"],
  Florida: [3, 2, "In God We Trust"], Georgia: [0, 2, "Wisdom, Justice, and Moderation"],
  Hawaii: [2, 2, "Ua mau ke ea o ka ʻāina i ka pono"], Idaho: [1, 2, "Esto perpetua"],
  Illinois: [0, 2, "State Sovereignty, National Union"], Indiana: [1, 0, "The Crossroads of America"],
  Iowa: [0, 1, "Our Liberties We Prize and Our Rights We Will Maintain"], Kansas: [0, 0, "Ad astra per aspera"],
  Kentucky: [1, 2, "United We Stand, Divided We Fall"], Louisiana: [0, 1, "Union, Justice and Confidence"],
  Maine: [1, 2, "Dirigo"], Maryland: [0, 2, "Fatti maschii, parole femine"],
  Massachusetts: [0, 0, "Ense petit placidam sub libertate quietem"], Michigan: [1, 0, "Si quaeris peninsulam amoenam circumspice"],
  Minnesota: [1, 2, "L’Étoile du Nord"], Mississippi: [0, 2, "Virtute et armis"],
  Missouri: [1, 1, "Salus populi suprema lex esto"], Montana: [2, 3, "Oro y Plata"],
  Nebraska: [0, 2, "Equality Before the Law"], Nevada: [2, 4, "All for Our Country"],
  "New Hampshire": [0, 0, "Live Free or Die"], "New Jersey": [0, 1, "Liberty and Prosperity"],
  "New Mexico": [2, 13, "Crescit eundo"], "New York": [0, 6, "Excelsior"],
  "North Carolina": [1, 0, "Esse quam videri"], "North Dakota": [1, 0, "Liberty and Union, Now and Forever, One and Inseparable"],
  Ohio: [1, 1, "With God, All Things Are Possible"], Oklahoma: [0, 0, "Labor omnia vincit"],
  Oregon: [1, 4, "Alis volat propriis"], Pennsylvania: [0, 1, "Virtue, Liberty, and Independence"],
  "Rhode Island": [0, 0, "Hope"], "South Carolina": [1, 0, "Dum spiro spero"],
  "South Dakota": [2, 1, "Under God the People Rule"], Tennessee: [1, 0, "Agriculture and Commerce"],
  Texas: [2, 4, "Friendship"], Utah: [5, 9, "Industry"],
  Vermont: [0, 0, "Freedom and Unity"], Virginia: [1, 3, "Sic semper tyrannis"],
  Washington: [3, 3, "Al-ki"], "West Virginia": [1, 0, "Montani semper liberi"],
  Wisconsin: [0, 0, "Forward"], Wyoming: [2, 2, "Equal Rights"],
  "District of Columbia": [0, 0, "Justitia omnibus"],
  "American Samoa": [1, 1, "Samoa, Muamua Le Atua"],
  Guam: [0, 0, "Where America’s Day Begins"],
  "Northern Mariana Islands": [0, 1, "Pride and Progress"],
  "Puerto Rico": [0, 0, "Joannes est nomen eius"],
  "U.S. Virgin Islands": [1, 1, "United in Pride and Hope"],
};

function renderStateStage(card, stage) {
  if (stage === 0) {
    resetStateCard(card);
    return;
  }

  const slot = card.querySelector(".state-stage");
  const surface = card.querySelector(".state-cycle-surface");
  if (!slot) return;

  const name = card.dataset.name || "State";
  const capital = card.dataset.capital || "";
  const area = card.dataset.area || "";
  const areaRank = card.dataset.areaRank || "";
  const landArea = card.dataset.landArea || area;
  const population = card.dataset.population || "";
  const populationRank = card.dataset.populationRank || "";
  const capitalPopulation = card.dataset.capitalPopulation || "";
  const flag = card.dataset.flag || "";
  const closeMap = card.dataset.closeMap || "";
  const isTerritoryPage = document.body.classList.contains("territory-page");
  const [nationalParks, nationalMonuments, stateMotto] =
    stateProtectedPlaces[name] || [0, 0, ""];

  card.dataset.stage = String(stage);
  card.classList.remove("stage-capital", "stage-map", "stage-close-map", "stage-flag", "stage-facts", "stage-compare", "stage-all");
  card.classList.add("is-active");

  if (stage === 1) {
    card.classList.add("stage-capital");
    slot.innerHTML = '<span class="cycle-label">Capital</span><strong>' + escapeHtml(capital) + '</strong>';
  }

  if (stage === 2) {
    card.classList.add("stage-map");
    if (isTerritoryPage) {
      slot.innerHTML = '<span class="cycle-label">Map</span><span class="state-media"><img src="' + escapeHtml(card.dataset.map || "") + '" alt="' + escapeHtml(name) + ' location map" loading="eager"></span>';
      addImageFallback(slot);
      return;
    }
    slot.innerHTML = '<span class="cycle-label">Map</span><span class="state-media state-map-media"><span class="state-map-loading">Loading map…</span><object class="state-map-object" data="../assets/states/maps/us-states.svg?v=20260724b" type="image/svg+xml" aria-label="' + escapeHtml(name) + ' map"></object></span>';
    const mapMedia = slot.querySelector(".state-map-media");
    const mapObject = slot.querySelector(".state-map-object");
    if (mapObject) {
      mapObject.addEventListener("load", () => {
        const mapDocument = mapObject.contentDocument;
        const mapStateAliases = {
          Alaska: "Alaska_2_",
          Arkansas: "Akansas",
          Hawaii: "Hawaii_1_",
          Texas: "Texas_1_",
        };
        const mapStateId = mapStateAliases[name] || name.replaceAll(" ", "_");
        const formerHighlight = mapDocument && mapDocument.getElementById("Alabama");
        const selectedState = mapDocument && mapDocument.getElementById(mapStateId);
        if (formerHighlight) formerHighlight.style.fill = "#fdfcea";
        if (selectedState) selectedState.style.fill = "#c12838";
        if (mapMedia) mapMedia.classList.add("is-loaded");
      }, { once: true });
    }
  }

  if (stage === 3 && isTerritoryPage) {
    card.classList.add("stage-close-map");
    slot.innerHTML =
      '<span class="cycle-label">Territory &amp; capital</span>' +
      '<span class="territory-close-map">' +
      '<img src="' + escapeHtml(closeMap) + '" alt="Close map of ' + escapeHtml(name) + '" loading="eager">' +
      '<span class="territory-capital-marker" style="left:' + escapeHtml(card.dataset.capitalX || "50") + '%;top:' + escapeHtml(card.dataset.capitalY || "50") + '%" aria-label="' + escapeHtml(capital) + ', capital"><b>★</b><small>' + escapeHtml(capital) + '</small></span>' +
      '</span>';
    addImageFallback(slot);
  }

  if ((stage === 3 && !isTerritoryPage) || (stage === 4 && isTerritoryPage)) {
    card.classList.add("stage-flag");
    slot.innerHTML = (isTerritoryPage ? '<span class="cycle-label">Flag</span>' : '') + '<span class="state-media"><img src="' + escapeHtml(flag) + '" alt="' + escapeHtml(name) + ' flag" loading="lazy"></span>';
    addImageFallback(slot);
  }

  if ((stage === 4 && !isTerritoryPage) || (stage === 5 && isTerritoryPage)) {
    card.classList.add("stage-facts");
    if (isTerritoryPage) {
      slot.innerHTML = '<span class="state-facts"><span>Total area: ' + escapeHtml(area) + ' sq mi</span><span>Land area: ' + escapeHtml(landArea) + ' sq mi</span><span>2020 population: ' + escapeHtml(population) + '</span><span>Capital population: ' + escapeHtml(capitalPopulation) + '</span></span>';
    } else {
      slot.innerHTML = '<span class="state-facts"><span>Capital: ' + escapeHtml(capital) + '</span><span>Motto: ' + escapeHtml(stateMotto) + '</span><span>Area: ' + escapeHtml(area) + ' sq mi' + (areaRank ? ', rank: ' + escapeHtml(areaRank) : '') + '</span><span>2020 population: ' + escapeHtml(population) + (populationRank ? ', rank: ' + escapeHtml(populationRank) : '') + '</span><span>National Parks: ' + nationalParks + '</span><span>National Monuments: ' + nationalMonuments + '</span></span>';
    }
  }

  if (stage === 6 && isTerritoryPage) {
    const utahTotalArea = 84897;
    const utahLandArea = 82376.85;
    const utahPopulation = 3271616;
    const saltLakeCityPopulation = 199723;
    const percentage = (value, benchmark) => {
      const result = (Number(String(value).replaceAll(",", "")) / benchmark) * 100;
      return result < 0.1 ? result.toFixed(2) : result < 10 ? result.toFixed(1) : Math.round(result).toLocaleString();
    };
    card.classList.add("stage-compare");
    slot.innerHTML =
      '<span class="cycle-label">Compared with Utah</span>' +
      '<span class="territory-comparison">' +
      '<span><b>Total area</b><em>' + percentage(area, utahTotalArea) + '%</em></span>' +
      '<span><b>Land area</b><em>' + percentage(landArea, utahLandArea) + '%</em></span>' +
      '<span><b>Population</b><em>' + percentage(population, utahPopulation) + '%</em></span>' +
      '<span><b>Capital population</b><em>' + percentage(capitalPopulation, saltLakeCityPopulation) + '%</em></span>' +
      '</span>';
  }

  if (stage === 5 && !isTerritoryPage) {
    card.classList.add("stage-all");
    slot.innerHTML = '<span class="cycle-label">All together</span><ul class="state-bullets"><li><strong>Capital:</strong> ' + escapeHtml(capital) + '</li><li><strong>Motto:</strong> ' + escapeHtml(stateMotto) + '</li><li><strong>Area:</strong> ' + escapeHtml(area) + ' sq mi' + (areaRank ? ', rank: ' + escapeHtml(areaRank) : '') + '</li><li><strong>2020 population:</strong> ' + escapeHtml(population) + (populationRank ? ', rank: ' + escapeHtml(populationRank) : '') + '</li><li><strong>National Parks:</strong> ' + nationalParks + '</li><li><strong>National Monuments:</strong> ' + nationalMonuments + '</li></ul>';
  }

  if (surface) surface.setAttribute("aria-label", "Show next " + name + " detail");
}

function renderTerritoryExpanded(card) {
  const slot = card.querySelector(".state-stage");
  const surface = card.querySelector(".state-cycle-surface");
  if (!slot || !surface) return;

  const name = card.dataset.name || "Territory";
  const capital = card.dataset.capital || "";
  const area = card.dataset.area || "";
  const landArea = card.dataset.landArea || "";
  const population = card.dataset.population || "";
  const capitalPopulation = card.dataset.capitalPopulation || "";
  const percentage = (value, benchmark) => {
    const result = (Number(String(value).replaceAll(",", "")) / benchmark) * 100;
    return result < 0.1 ? result.toFixed(2) : result < 10 ? result.toFixed(1) : Math.round(result).toLocaleString();
  };

  card.dataset.stage = "expanded";
  card.classList.add("is-active", "territory-expanded");
  surface.setAttribute("aria-label", "Collapse " + name);
  slot.innerHTML =
    '<span class="territory-profile">' +
      '<span class="territory-profile-facts">' +
        '<span><small>Capital</small><b>' + escapeHtml(capital) + '</b><i>' + escapeHtml(capitalPopulation) + ' people</i></span>' +
        '<span><small>2020 population</small><b>' + escapeHtml(population) + '</b></span>' +
        '<span><small>Land area</small><b>' + escapeHtml(landArea) + ' sq mi</b></span>' +
        '<span><small>Total area</small><b>' + escapeHtml(area) + ' sq mi</b></span>' +
      '</span>' +
      '<span class="territory-profile-visuals">' +
        '<span><small>World location</small><img src="' + escapeHtml(card.dataset.map || "") + '" alt="' + escapeHtml(name) + ' world location map"></span>' +
        '<span><small>Territory &amp; capital</small><span class="territory-close-map"><img src="' + escapeHtml(card.dataset.closeMap || "") + '" alt="Close map of ' + escapeHtml(name) + '"><span class="territory-capital-marker" style="left:' + escapeHtml(card.dataset.capitalX || "50") + '%;top:' + escapeHtml(card.dataset.capitalY || "50") + '%"><b>★</b><small>' + escapeHtml(capital) + '</small></span></span></span>' +
      '</span>' +
      '<span class="territory-profile-flag"><small>Flag</small><img src="' + escapeHtml(card.dataset.flag || "") + '" alt="' + escapeHtml(name) + ' flag"></span>' +
      '<span class="territory-profile-compare"><small>Compared with Utah</small><span class="territory-comparison">' +
        '<span><b>Total area</b><em>' + percentage(area, 84897) + '%</em></span>' +
        '<span><b>Land area</b><em>' + percentage(landArea, 82376.85) + '%</em></span>' +
        '<span><b>Population</b><em>' + percentage(population, 3271616) + '%</em></span>' +
        '<span><b>Capital population</b><em>' + percentage(capitalPopulation, 199723) + '%</em></span>' +
      '</span></span>' +
      '<span class="territory-collapse-hint">Tap this card to close</span>' +
    '</span>';
  addImageFallback(slot);
}

let stateCardColorIndex = 0;
let stateGridMode = "";
let updateStateGridButtons = () => {};
document.querySelectorAll(".state-cycle-card").forEach((card) => {
  if (!document.body.classList.contains("territory-page")) {
    card.dataset.cardColor = card.dataset.name === "Utah"
      ? "4"
      : String(stateCardColorIndex++ % 5);
  }
  const surface = card.querySelector(".state-cycle-surface");
  const reset = card.querySelector(".state-card-reset");

  if (surface) {
    surface.addEventListener("click", () => {
      if (document.body.classList.contains("territory-page")) {
        if (card.classList.contains("territory-expanded")) {
          resetStateCard(card);
        } else {
          document.querySelectorAll(".territory-page .state-cycle-card").forEach(resetStateCard);
          renderTerritoryExpanded(card);
          window.requestAnimationFrame(() => card.scrollIntoView({ behavior: "smooth", block: "start" }));
        }
        return;
      }
      document.querySelectorAll(".states-page .state-cycle-card").forEach((otherCard) => {
        if (otherCard !== card) resetStateCard(otherCard);
      });
      stateGridMode = "";
      updateStateGridButtons();
      const current = Number(card.dataset.stage || "0");
      if (current === 0) {
        renderStateStage(card, 4);
      } else if (current === 4) {
        renderStateStage(card, 3);
      } else {
        resetStateCard(card);
      }
    });
  }

  if (reset) {
    reset.addEventListener("click", () => {
      if (document.body.classList.contains("states-page") && stateGridMode) {
        document.querySelectorAll(".states-page .state-cycle-card").forEach(resetStateCard);
        stateGridMode = "";
        updateStateGridButtons();
      } else {
        resetStateCard(card);
      }
    });
  }
});

const revealStateGrid = document.querySelector(".reveal-state-grid");
const resetStateGrid = document.querySelector(".reset-state-grid");
if (revealStateGrid && resetStateGrid) {
  updateStateGridButtons = () => {
    resetStateGrid.textContent = stateGridMode === "details" ? "Reset" : "All Details";
    revealStateGrid.textContent = stateGridMode === "flags" ? "Reset" : "All Flags";
    resetStateGrid.setAttribute("aria-pressed", stateGridMode === "details" ? "true" : "false");
    revealStateGrid.setAttribute("aria-pressed", stateGridMode === "flags" ? "true" : "false");
  };

  const setStateGridMode = (mode) => {
    const cards = document.querySelectorAll(".state-cycle-card");
    if (stateGridMode === mode) {
      cards.forEach(resetStateCard);
      stateGridMode = "";
    } else {
      cards.forEach((card) => renderStateStage(card, mode === "details" ? 4 : 3));
      stateGridMode = mode;
    }
    updateStateGridButtons();
  };

  resetStateGrid.addEventListener("click", () => setStateGridMode("details"));
  revealStateGrid.addEventListener("click", () => setStateGridMode("flags"));
}

const stateSortBy = document.querySelector("#stateSortBy");
const stateSortDirection = document.querySelector("#stateSortDirection");
const stateCycleGrid = document.querySelector(".state-cycle-grid");
const territorySortButtons = document.querySelectorAll("[data-territory-sort]");
if (territorySortButtons.length && stateCycleGrid) {
  const territoryCards = Array.from(stateCycleGrid.querySelectorAll(".state-cycle-card"));
  territorySortButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.dataset.territorySort;
      const orderedCards = [...territoryCards].sort((a, b) => {
        if (category === "name") return a.dataset.name.localeCompare(b.dataset.name);
        const dataKey = category === "area" ? "landArea" : category;
        const first = Number(a.dataset[dataKey].replaceAll(",", ""));
        const second = Number(b.dataset[dataKey].replaceAll(",", ""));
        return (second - first) || a.dataset.name.localeCompare(b.dataset.name);
      });
      orderedCards.forEach((card) => stateCycleGrid.append(card));
      territorySortButtons.forEach((choice) => {
        const active = choice === button;
        choice.classList.toggle("is-active", active);
        choice.setAttribute("aria-pressed", String(active));
      });
    });
  });
}
if (stateSortBy && stateSortDirection && stateCycleGrid) {
  const stateCards = Array.from(stateCycleGrid.querySelectorAll(".state-cycle-card:not(.district-of-columbia-card)"));
  const utahPositionMarker = stateCycleGrid.querySelector(".utah-position-marker");
  const districtOfColumbiaCard = stateCycleGrid.querySelector(".district-of-columbia-card");
  const districtOfColumbiaFeature = stateCycleGrid.querySelector(".dc-memorial-feature");
  const districtOfColumbiaDivider = stateCycleGrid.querySelector(".district-of-columbia-divider");
  const stateIllustrationTemplate = stateCycleGrid.querySelector(".state-rotator");
  const isTerritoryPage = document.body.classList.contains("territory-page");
  const stateScenes = [
    { src: "../assets/states/decorations/statue-liberty.png", alt: "Statue of Liberty and New York skyline" },
    { src: "../assets/states/decorations/golden-gate.png", alt: "Golden Gate Bridge" },
    { src: "../assets/states/decorations/grand-canyon.png", alt: "Grand Canyon" },
    { src: "../assets/states/decorations/gateway-arch.png", alt: "Gateway Arch and Mississippi riverboat" },
    { src: "../assets/states/decorations/new-england-lighthouse.png", alt: "New England lighthouse" },
    { src: "../assets/states/decorations/denali.png", alt: "Denali and an Alaska moose" },
    { src: "../assets/states/decorations/hawaii-volcano.png", alt: "Hawaiian volcano and Pacific coast" },
  ];
  const shuffledStateScenes = [...stateScenes];
  for (let index = shuffledStateScenes.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledStateScenes[index], shuffledStateScenes[swapIndex]] =
      [shuffledStateScenes[swapIndex], shuffledStateScenes[index]];
  }
  const stateIllustrations = stateIllustrationTemplate
    ? shuffledStateScenes.slice(0, isTerritoryPage ? 3 : 7).map((scene, index) => {
        const figure = index === 0
          ? stateIllustrationTemplate
          : stateIllustrationTemplate.cloneNode(true);
        const image = figure.querySelector("img");
        const alignment = ["left", "center", "right"][index % 3];
        figure.classList.add("state-image-" + alignment);
        image.src = scene.src;
        image.alt = scene.alt;
        figure.removeAttribute("aria-hidden");
        return figure;
      })
    : [];
  const stateIllustrationPlacements = [5, 12, 19, 26, 33, 40, 47];
  const territoryIllustrationPlacements = [0, 2, 4];
  const directionLabels = {
    name: { asc: "A–Z", desc: "Z–A" },
    parks: { asc: "Fewest first", desc: "Most first" },
    monuments: { asc: "Fewest first", desc: "Most first" },
    area: { asc: "Smallest first", desc: "Largest first" },
    population: { asc: "Smallest first", desc: "Largest first" },
  };

  function updateStateDirectionLabels(resetToAscending = false) {
    const selectedDirection = resetToAscending
      ? "asc"
      : stateSortDirection.dataset.direction || "asc";
    const labels = directionLabels[stateSortBy.value];
    stateSortDirection.dataset.direction = selectedDirection;
    stateSortDirection.querySelectorAll("button").forEach((button) => {
      const active = button.dataset.direction === selectedDirection;
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute("aria-label", labels[button.dataset.direction]);
      button.title = labels[button.dataset.direction];
    });
  }

  function sortStateCards() {
    const category = stateSortBy.value;
    const direction = stateSortDirection.dataset.direction === "desc" ? -1 : 1;
    const sortableItems = utahPositionMarker
      ? [...stateCards, utahPositionMarker]
      : [...stateCards];
    const orderedItems = sortableItems.sort((a, b) => {
      if (category === "name") {
        return a.dataset[category].localeCompare(b.dataset[category]) * direction;
      }
      if (category === "parks" || category === "monuments") {
        const protectedPlaceIndex = category === "parks" ? 0 : 1;
        const first = stateProtectedPlaces[a.dataset.name][protectedPlaceIndex];
        const second = stateProtectedPlaces[b.dataset.name][protectedPlaceIndex];
        return ((first - second) * direction)
          || a.dataset.name.localeCompare(b.dataset.name);
      }
      const first = Number(a.dataset[category].replaceAll(",", ""));
      const second = Number(b.dataset[category].replaceAll(",", ""));
      return (first - second) * direction;
    });
    orderedItems.forEach((item) => stateCycleGrid.append(item));
    const orderedCards = orderedItems.filter((item) => item.classList.contains("state-cycle-card"));
    if (districtOfColumbiaDivider) stateCycleGrid.append(districtOfColumbiaDivider);
    if (districtOfColumbiaCard) stateCycleGrid.append(districtOfColumbiaCard);
    if (districtOfColumbiaFeature) stateCycleGrid.append(districtOfColumbiaFeature);
    stateIllustrations.forEach((figure, index) => {
      const placementCard = isTerritoryPage
        ? orderedCards[territoryIllustrationPlacements[index]]
        : orderedCards[stateIllustrationPlacements[index]];
      if (placementCard) placementCard.after(figure);
    });
  }

  stateSortBy.addEventListener("change", () => {
    updateStateDirectionLabels(true);
    sortStateCards();
  });
  stateSortDirection.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      stateSortDirection.dataset.direction = button.dataset.direction;
      updateStateDirectionLabels();
      sortStateCards();
    });
  });
  updateStateDirectionLabels();
  sortStateCards();
}

const territoryBottomImage = document.querySelector(".territory-bottom-illustration img");
if (territoryBottomImage) {
  const territoryImages = territoryBottomImage.dataset.images.split("|");
  territoryBottomImage.src = territoryImages[Math.floor(Math.random() * territoryImages.length)];
}

function resetDistrictCard(card) {
  const slot = card.querySelector(".district-stage");
  const surface = card.querySelector(".district-cycle-surface");
  card.dataset.stage = "0";
  card.classList.remove("is-active", "stage-coverage", "stage-verification", "stage-all");
  if (slot) slot.textContent = "";
  if (surface) surface.setAttribute("aria-label", "Show " + (card.dataset.label || "district") + " details");
}

function renderDistrictStage(card, stage) {
  if (stage === 0) {
    resetDistrictCard(card);
    return;
  }

  const slot = card.querySelector(".district-stage");
  const surface = card.querySelector(".district-cycle-surface");
  if (!slot) return;

  const label = card.dataset.label || "District";
  const answer = card.dataset.answer || "";
  const note = card.dataset.note || "";

  card.dataset.stage = String(stage);
  card.classList.remove("stage-coverage", "stage-verification", "stage-all");
  card.classList.add("is-active");

  if (stage === 1) {
    card.classList.add("stage-coverage");
    slot.innerHTML = '<span class="district-label">Coverage note</span><strong>' + escapeHtml(answer) + '</strong>';
  }

  if (stage === 2) {
    card.classList.add("stage-verification");
    slot.innerHTML = '<span class="district-label">Verification note</span><span>' + escapeHtml(note) + '</span>';
  }

  if (stage === 3) {
    card.classList.add("stage-all");
    slot.innerHTML = '<span class="district-label">All together</span><ul class="district-bullets"><li><strong>Coverage:</strong> ' + escapeHtml(answer) + '</li><li><strong>Note:</strong> ' + escapeHtml(note) + '</li></ul>';
  }

  if (surface) surface.setAttribute("aria-label", "Show next " + label + " detail");
}

function districtCardsForGroup(group) {
  return document.querySelectorAll('.district-cycle-card[data-district-group="' + group + '"]');
}

document.querySelectorAll(".district-cycle-card").forEach((card) => {
  const surface = card.querySelector(".district-cycle-surface");
  const reset = card.querySelector(".district-card-reset");

  if (surface) {
    surface.addEventListener("click", () => {
      const current = Number(card.dataset.stage || "0");
      const next = current >= 2 ? 1 : current + 1;
      renderDistrictStage(card, next);
    });
  }

  if (reset) {
    reset.addEventListener("click", () => {
      resetDistrictCard(card);
    });
  }
});

document.querySelectorAll(".district-reveal-all").forEach((button) => {
  button.addEventListener("click", () => {
    districtCardsForGroup(button.dataset.districtGroup || "").forEach((card) => renderDistrictStage(card, 3));
  });
});

document.querySelectorAll(".district-reset-all").forEach((button) => {
  button.addEventListener("click", () => {
    districtCardsForGroup(button.dataset.districtGroup || "").forEach(resetDistrictCard);
  });
});
