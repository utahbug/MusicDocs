(() => {
  const svgNS = "http://www.w3.org/2000/svg";
  const map = document.getElementById("puzzle-map");
  const piecePanel = document.getElementById("piece-panel");
  const pieceButton = document.getElementById("piece-button");
  const piecePreview = document.getElementById("piece-preview");
  const currentCounty = document.getElementById("current-county");
  const status = document.getElementById("puzzle-status");
  const skipButton = document.getElementById("skip-button");
  const progress = document.getElementById("puzzle-progress");
  const resetButton = document.getElementById("reset-puzzle");
  const hintButton = document.getElementById("hint-button");
  const guideButton = document.getElementById("guide-button");
  const nameButton = document.getElementById("name-button");
  const palette = ["#78a99b", "#d5a84b", "#c77c5a", "#80aeca", "#9b82b6"];
  const borderCountyNames = new Set([
    "Box Elder", "Cache", "Rich", "Daggett", "Uintah", "Grand", "San Juan",
    "Kane", "Washington", "Iron", "Beaver", "Millard", "Juab", "Tooele"
  ]);
  const stateOutlinePath = [
    "M29.51,29.54",
    "L60.28,30.46 L175.76,28.62 L289.23,28.15 L385.55,28.46 L450.1,28",
    "L450.1,206.51 L597.35,206.51 L730.99,206.06",
    "L730.99,265.46 L730.49,342.4 L730.49,468.15 L730.49,569.98",
    "L729.48,639.01 L729.48,677.24 L732,697.91 L732,802.9 L731.5,891.86",
    "L649.8,892 L597.35,892 L531.29,892 L407.74,891.43 L240.81,891.57",
    "L128.86,891.57 L28,891.57 L28,790.49 L28.5,698.63 L28,626.73",
    "L28.5,608.87 L28.5,460.44 L28.5,397.54 L28.5,360.81",
    "L29.01,246.3 L29.51,206.06 Z",
  ].join(" ");

  let data = null;
  let queue = [];
  let queueIndex = 0;
  let current = null;
  let placedLayer = null;
  let targets = new Map();
  let pieceSelected = false;
  let locked = false;
  let dragState = null;
  let floatingPiece = null;
  let countyNameHidden = false;
  const placedPaths = new Map();
  let countyKissPlayed = false;
  let countyKissTimer = 0;
  let currentFailureCount = 0;

  function createSvgElement(tagName) {
    return document.createElementNS(svgNS, tagName);
  }

  function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  async function loadCountyData() {
    if (window.UTAH_COUNTY_MAP_DATA) return window.UTAH_COUNTY_MAP_DATA;

    const response = await fetch("county-map.html", { cache: "no-store" });
    if (!response.ok) throw new Error("County map data could not be loaded.");
    const html = await response.text();
    const documentCopy = new DOMParser().parseFromString(html, "text/html");
    const mapData = documentCopy.getElementById("mapData");
    if (!mapData) throw new Error("County map data is missing.");
    return JSON.parse(mapData.textContent);
  }

  function buildMap() {
    map.setAttribute("viewBox", data.viewBox);
    const silhouetteLayer = createSvgElement("g");
    const guideLayer = createSvgElement("g");
    placedLayer = createSvgElement("g");
    const targetLayer = createSvgElement("g");
    const stateOutline = createSvgElement("path");
    silhouetteLayer.setAttribute("aria-hidden", "true");
    guideLayer.setAttribute("aria-hidden", "true");
    placedLayer.setAttribute("aria-hidden", "true");
    targetLayer.setAttribute("aria-label", "County placement locations");
    stateOutline.setAttribute("d", stateOutlinePath);
    stateOutline.setAttribute("class", "state-outline");
    stateOutline.setAttribute("aria-hidden", "true");

    data.counties.forEach((county) => {
      const silhouette = createSvgElement("path");
      const guide = createSvgElement("path");
      const target = createSvgElement("path");

      silhouette.setAttribute("d", county.path);
      silhouette.setAttribute("class", "state-silhouette");
      guide.setAttribute("d", county.path);
      guide.setAttribute("class", "county-guide");
      target.setAttribute("d", county.path);
      target.setAttribute("class", "county-target");
      target.setAttribute("data-county-id", county.id);
      target.setAttribute("role", "button");
      target.setAttribute("tabindex", "0");
      target.setAttribute("aria-label", `${county.name} County location`);
      target.addEventListener("click", () => {
        if (pieceSelected && !locked) attemptPlacement(county.id);
        else if (!locked) status.textContent = "Tap the county piece first, then tap the map.";
      });
      target.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        if (pieceSelected && !locked) attemptPlacement(county.id);
        else if (!locked) status.textContent = "Select the county piece first.";
      });

      silhouetteLayer.append(silhouette);
      guideLayer.append(guide);
      targetLayer.append(target);
      targets.set(county.id, target);
    });

    map.append(silhouetteLayer, guideLayer, placedLayer, stateOutline, targetLayer);
  }

  function currentTargetBox() {
    const target = targets.get(current.id);
    return target ? target.getBBox() : { x: 0, y: 0, width: 100, height: 100 };
  }

  function setPreview(svg, county, box) {
    const padding = Math.max(box.width, box.height) * .12 + 6;
    svg.setAttribute(
      "viewBox",
      `${box.x - padding} ${box.y - padding} ${box.width + padding * 2} ${box.height + padding * 2}`
    );
    const path = createSvgElement("path");
    path.setAttribute("d", county.path);
    svg.replaceChildren(path);
  }

  function setPieceSelected(selected) {
    pieceSelected = selected;
    pieceButton.setAttribute("aria-pressed", String(selected));
    if (selected) {
      status.textContent = countyNameHidden
        ? "Now tap where this county belongs."
        : `Now tap where ${current.name} County belongs.`;
    }
  }

  function showCurrentPiece() {
    locked = false;
    pieceSelected = false;
    currentFailureCount = 0;
    skipButton.hidden = true;
    pieceButton.setAttribute("aria-pressed", "false");
    piecePanel.classList.remove("is-complete");
    piecePanel.classList.remove(
      "is-weber-bat",
      "is-davis-horse",
      "is-tooele-horse-body",
      "is-utah-boot",
      "is-salt-lake-ghost"
    );

    if (queueIndex >= queue.length) {
      current = null;
      currentCounty.textContent = "Utah complete!";
      pieceButton.hidden = true;
      pieceButton.disabled = true;
      const completion = document.createElement("span");
      completion.className = "completion-mark";
      completion.setAttribute("aria-hidden", "true");
      completion.textContent = "✓";
      document.getElementById("piece-tray").replaceChildren(completion);
      piecePanel.classList.add("is-complete");
      status.textContent = "All 29 counties are in place.";
      progress.textContent = "29 of 29";
      hintButton.disabled = true;
      return;
    }

    current = queue[queueIndex];
    piecePanel.classList.toggle("is-weber-bat", current.name === "Weber");
    piecePanel.classList.toggle("is-davis-horse", current.name === "Davis");
    piecePanel.classList.toggle("is-tooele-horse-body", current.name === "Tooele");
    piecePanel.classList.toggle("is-utah-boot", current.name === "Utah");
    piecePanel.classList.toggle("is-salt-lake-ghost", current.name === "Salt Lake");
    currentCounty.textContent = `${current.name} County`;
    pieceButton.hidden = false;
    pieceButton.disabled = false;
    hintButton.disabled = false;
    setPreview(piecePreview, current, currentTargetBox());
    status.textContent = "Place this county on the map.";
    progress.textContent = `${queueIndex} of ${queue.length}`;
  }

  function addPlacedCounty(county) {
    const path = createSvgElement("path");
    const characterFill =
      county.name === "Weber"
        ? "#171a1d"
        : county.name === "Davis" || county.name === "Tooele"
          ? "#9b6038"
          : palette[queueIndex % palette.length];
    path.setAttribute("d", county.path);
    path.setAttribute("class", "placed-county is-new");
    path.setAttribute("fill", characterFill);
    const title = createSvgElement("title");
    title.textContent = `${county.name} County`;
    path.append(title);
    placedLayer.append(path);
    placedPaths.set(county.name, path);
    window.setTimeout(() => path.classList.remove("is-new"), 500);
    maybePlayCountyKiss();
  }

  function maybePlayCountyKiss() {
    if (
      countyKissPlayed ||
      !placedPaths.has("Summit") ||
      !placedPaths.has("Salt Lake")
    ) {
      return;
    }

    countyKissPlayed = true;
    countyKissTimer = window.setTimeout(() => {
      const summitPath = placedPaths.get("Summit");
      const saltLakePath = placedPaths.get("Salt Lake");
      if (
        !summitPath?.isConnected ||
        !saltLakePath?.isConnected ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        typeof summitPath.animate !== "function"
      ) {
        return;
      }

      const summitRect = summitPath.getBoundingClientRect();
      const saltLakeRect = saltLakePath.getBoundingClientRect();
      const summitCenter = {
        x: summitRect.left + summitRect.width / 2,
        y: summitRect.top + summitRect.height / 2,
      };
      const saltLakeCenter = {
        x: saltLakeRect.left + saltLakeRect.width / 2,
        y: saltLakeRect.top + saltLakeRect.height / 2,
      };
      const vectorX = saltLakeCenter.x - summitCenter.x;
      const vectorY = saltLakeCenter.y - summitCenter.y;
      const vectorLength = Math.hypot(vectorX, vectorY) || 1;
      const mapWidth = map.getBoundingClientRect().width;
      const travel = Math.max(5, Math.min(10, mapWidth * .014));
      const moveX = (vectorX / vectorLength) * travel;
      const moveY = (vectorY / vectorLength) * travel;

      summitPath.style.transformBox = "fill-box";
      summitPath.style.transformOrigin = "center";
      summitPath.animate(
        [
          { transform: "translate(0, 0) rotate(0deg)", offset: 0 },
          {
            transform: `translate(${moveX * .72}px, ${moveY * .72}px) rotate(-0.7deg)`,
            offset: .36,
          },
          {
            transform: `translate(${moveX}px, ${moveY}px) rotate(-1.1deg) scale(1.012)`,
            offset: .52,
          },
          {
            transform: `translate(${moveX * .76}px, ${moveY * .76}px) rotate(-0.55deg)`,
            offset: .67,
          },
          { transform: "translate(0, 0) rotate(0deg)", offset: 1 },
        ],
        {
          duration: 840,
          easing: "ease-in-out",
        }
      );
    }, 620);
  }

  function flashTarget(countyId, className, duration) {
    const target = targets.get(countyId);
    if (!target) return;
    target.classList.add(className);
    window.setTimeout(() => target.classList.remove(className), duration);
  }

  function registerPlacementFailure(message) {
    currentFailureCount += 1;
    const canSaveForLater =
      currentFailureCount >= 2 && queueIndex < queue.length - 1;
    skipButton.hidden = !canSaveForLater;
    status.textContent = canSaveForLater
      ? `${message} You can skip this piece for now.`
      : message;
  }

  function attemptPlacement(countyId) {
    if (!current || locked) return;
    if (!countyId) {
      registerPlacementFailure("Drop the piece on the Utah map.");
      return;
    }

    if (countyId !== current.id) {
      registerPlacementFailure("Not there—try again.");
      flashTarget(countyId, "is-wrong", 620);
      return;
    }

    locked = true;
    skipButton.hidden = true;
    pieceSelected = false;
    pieceButton.setAttribute("aria-pressed", "false");
    addPlacedCounty(current);
    status.textContent = `Correct—${current.name} County.`;
    queueIndex += 1;
    progress.textContent = `${queueIndex} of ${queue.length}`;
    window.setTimeout(showCurrentPiece, 540);
  }

  function beginPuzzle() {
    if (!data) return;
    window.clearTimeout(countyKissTimer);
    countyKissTimer = 0;
    countyKissPlayed = false;
    placedPaths.clear();
    const borderCounties = data.counties.filter((county) => borderCountyNames.has(county.name));
    const interiorCounties = data.counties.filter((county) => !borderCountyNames.has(county.name));
    queue = [...shuffle(borderCounties), ...shuffle(interiorCounties)];
    queueIndex = 0;
    current = null;
    locked = false;
    pieceSelected = false;
    placedLayer.replaceChildren();
    targets.forEach((target) => target.classList.remove("is-hint", "is-wrong"));
    const tray = document.getElementById("piece-tray");
    if (!tray.contains(pieceButton)) tray.replaceChildren(pieceButton);
    showCurrentPiece();
  }

  function positionFloatingPiece(event) {
    if (!floatingPiece) return;
    const pieceRect = floatingPiece.getBoundingClientRect();
    const width = pieceRect.width || 116;
    const height = pieceRect.height || 116;
    const left = Math.min(window.innerWidth - width - 6, Math.max(6, event.clientX - width / 2));
    const top = Math.min(window.innerHeight - height - 6, Math.max(6, event.clientY - height - 24));
    floatingPiece.style.left = `${left}px`;
    floatingPiece.style.top = `${top}px`;
  }

  function sizeFloatingPiece(box) {
    const target = current ? targets.get(current.id) : null;
    const targetRect = target?.getBoundingClientRect();
    if (!targetRect?.width || !targetRect?.height) return { width: 116, height: 116 };

    const targetMaximum = Math.max(targetRect.width, targetRect.height);
    const sizeCap = window.matchMedia("(max-width: 720px)").matches ? 108 : 145;
    const desiredMaximum = Math.min(sizeCap, Math.max(36, targetMaximum * 1.05));
    const scale = desiredMaximum / targetMaximum;
    const desiredWidth = targetRect.width * scale;
    const desiredHeight = targetRect.height * scale;
    const previewPadding = Math.max(box.width, box.height) * .12 + 6;

    return {
      width: desiredWidth * ((box.width + previewPadding * 2) / box.width),
      height: desiredHeight * ((box.height + previewPadding * 2) / box.height),
    };
  }

  function createFloatingPiece(event) {
    floatingPiece = document.createElement("div");
    const characterClass =
      current?.name === "Weber"
        ? " is-weber-bat"
        : current?.name === "Davis"
          ? " is-davis-horse"
          : current?.name === "Tooele"
            ? " is-tooele-horse-body"
          : "";
    floatingPiece.className = `floating-piece${characterClass}`;
    const svg = createSvgElement("svg");
    const targetBox = currentTargetBox();
    const size = sizeFloatingPiece(targetBox);
    floatingPiece.style.width = `${size.width}px`;
    floatingPiece.style.height = `${size.height}px`;
    setPreview(svg, current, targetBox);
    floatingPiece.append(svg);
    document.body.append(floatingPiece);
    positionFloatingPiece(event);
  }

  function removeFloatingPiece() {
    floatingPiece?.remove();
    floatingPiece = null;
  }

  function countyIdAtDropPoint(event) {
    if (!floatingPiece) {
      return document.elementFromPoint(event.clientX, event.clientY)
        ?.closest?.("[data-county-id]")?.dataset.countyId || null;
    }

    const pieceRect = floatingPiece.getBoundingClientRect();
    const dropX = pieceRect.left + pieceRect.width / 2;
    const dropY = pieceRect.top + pieceRect.height / 2;
    const currentTarget = current ? targets.get(current.id) : null;

    if (currentTarget) {
      const targetRect = currentTarget.getBoundingClientRect();
      const tolerance = Math.max(
        10,
        Math.min(18, Math.max(targetRect.width, targetRect.height) * .14)
      );
      const isOverCurrentTarget =
        dropX >= targetRect.left - tolerance &&
        dropX <= targetRect.right + tolerance &&
        dropY >= targetRect.top - tolerance &&
        dropY <= targetRect.bottom + tolerance;

      if (isOverCurrentTarget) return current.id;
    }

    return document.elementFromPoint(dropX, dropY)
      ?.closest?.("[data-county-id]")?.dataset.countyId || null;
  }

  pieceButton.addEventListener("pointerdown", (event) => {
    if (!current || locked || pieceButton.disabled) return;
    event.preventDefault();
    pieceButton.setPointerCapture(event.pointerId);
    dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false
    };
    pieceButton.classList.add("is-dragging");
    createFloatingPiece(event);
  });

  pieceButton.addEventListener("pointermove", (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY);
    if (!dragState.moved && distance > 7) {
      dragState.moved = true;
    }
    if (dragState.moved) positionFloatingPiece(event);
  });

  pieceButton.addEventListener("pointerup", (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const wasMoved = dragState.moved;
    dragState = null;
    pieceButton.classList.remove("is-dragging");

    if (wasMoved) {
      const countyId = countyIdAtDropPoint(event);
      removeFloatingPiece();
      attemptPlacement(countyId);
    } else {
      removeFloatingPiece();
      setPieceSelected(!pieceSelected);
    }
  });

  pieceButton.addEventListener("pointercancel", () => {
    dragState = null;
    pieceButton.classList.remove("is-dragging");
    removeFloatingPiece();
  });

  pieceButton.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setPieceSelected(!pieceSelected);
  });

  hintButton.addEventListener("click", () => {
    if (!current || locked) return;
    setPieceSelected(true);
    flashTarget(current.id, "is-hint", 1450);
    status.textContent = "Hint: the correct location is highlighted.";
  });

  guideButton.addEventListener("click", () => {
    const willHide = !map.classList.contains("hide-guides");
    map.classList.toggle("hide-guides", willHide);
    guideButton.setAttribute("aria-pressed", String(willHide));
    guideButton.textContent = willHide ? "Show outlines" : "Hide outlines";
  });

  nameButton.addEventListener("click", () => {
    countyNameHidden = !countyNameHidden;
    currentCounty.classList.toggle("is-hidden", countyNameHidden);
    nameButton.setAttribute("aria-pressed", String(countyNameHidden));
    nameButton.textContent = countyNameHidden ? "Show county name" : "Hide county name";
    status.textContent = countyNameHidden
      ? "County names are hidden."
      : "County names are shown.";
  });

  skipButton.addEventListener("click", () => {
    if (!current || locked || queueIndex >= queue.length - 1) return;
    const [savedCounty] = queue.splice(queueIndex, 1);
    queue.push(savedCounty);
    current = null;
    showCurrentPiece();
    status.textContent = "Piece saved for later. Place the next county.";
  });

  resetButton.addEventListener("click", beginPuzzle);

  loadCountyData()
    .then((loadedData) => {
      data = loadedData;
      buildMap();
      beginPuzzle();
    })
    .catch(() => {
      currentCounty.textContent = "Puzzle unavailable";
      status.textContent = "The county map data could not be loaded. Refresh the page to try again.";
      progress.textContent = "0 of 29";
      pieceButton.disabled = true;
      hintButton.disabled = true;
    });
})();
